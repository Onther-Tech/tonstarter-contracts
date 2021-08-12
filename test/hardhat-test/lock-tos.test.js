/* eslint-disable no-undef */
const chai = require("chai");
const { expect } = require("chai");

const { solidity } = require("ethereum-waffle");
chai.use(solidity);

const { time } = require("@openzeppelin/test-helpers");
const { toBN, toWei, keccak256, fromWei } = require("web3-utils");

const {
  getAddresses,
  findSigner,
  setupContracts,
  mineBlocks,
} = require("./utils");
const { ethers, network } = require("hardhat");

const {
  calculateBalanceOfLock,
  calculateBalanceOfUser,
  createLockWithPermit,
} = require("./helpers/lock-tos-helper");

describe("LockTOS", function () {
  let admin, user;
  let tos;
  let lockTOS;
  let phase3StartTime;
  const userLockInfo = [];
  const tosAmount = 1000000000;

  // Helper functions
  before(async () => {
    const addresses = await getAddresses();
    admin = await findSigner(addresses[0]);
    user = await findSigner(addresses[1]);
  });

  it("Initialize contracts", async function () {
    this.timeout(1000000);
    ({ tos } = await setupContracts(admin.address));
  });

  it("Deploy LockTOS", async function () {
    phase3StartTime = (await time.latest()) + time.duration.weeks(10);
    lockTOS = await (
      await ethers.getContractFactory("LockTOS")
    ).deploy(admin.address, tos.address, phase3StartTime);
    await lockTOS.deployed();
  });

  it("mint TOS to users", async function () {
    await (await tos.connect(admin).mint(user.address, tosAmount)).wait();
    expect(await tos.balanceOf(user.address)).to.be.equal(tosAmount);
  });

  it("should create locks for user", async function () {
    userLockInfo.push({
      lockId: await createLockWithPermit({
        tos,
        lockTOS,
        user,
        amount: 100000000,
        unlockWeeks: 1,
      }),
      updates: [{}], // empty object for record
    });

    userLockInfo.push({
      lockId: await createLockWithPermit({
        tos,
        lockTOS,
        user,
        amount: 300000000,
        unlockWeeks: 20,
      }),
      updates: [
        {},
        { amount: 20000 },
        { amount: 10000 },
        { amount: 30000 },
        { unlockWeeks: 3 }, // 3 weeks
      ],
    });

    userLockInfo.push({
      lockId: await createLockWithPermit({
        tos,
        lockTOS,
        user,
        amount: 300000000,
        unlockWeeks: 5,
      }),
      updates: [{}, { amount: 10000 }],
    });

    userLockInfo.push({
      lockId: await createLockWithPermit({
        tos,
        lockTOS,
        user,
        amount: 200000000,
        unlockWeeks: 155,
      }),
      updates: [
        {},
        { unlockWeeks: 4 }, // 4 weeks
        { amount: 20000 },
        { amount: 4000 },
        { unlockWeeks: 2 }, // 2 weeks
      ],
    });
  });

  it("should check balances of user at now", async function () {
    const totalBalance = parseInt(await lockTOS.balanceOf(user.address));
    const estimatedTotalBalance = parseInt(
      await calculateBalanceOfUser({
        user,
        lockTOS,
        timestamp: parseInt(await time.latest()),
      })
    );
    expect(totalBalance).to.equal(estimatedTotalBalance);

    for (const info of userLockInfo) {
      const currentTime = parseInt(await time.latest());
      const { lockId } = info;
      const balance = parseInt(await lockTOS.balanceOfLock(lockId));
      const estimate = await calculateBalanceOfLock({
        lockId,
        tos,
        lockTOS,
        timestamp: currentTime,
      });
      expect(balance).to.equal(estimate);
    }
  });

  it("should check of balances at the start", async function () {
    for (const info of userLockInfo) {
      const { lockId } = info;
      const lock = await lockTOS.lockedBalances(user.address, lockId);
      const balance = parseInt(
        await lockTOS.balanceOfLockAt(lockId, lock.start)
      );
      const estimate = await calculateBalanceOfLock({
        user,
        lockId,
        lockTOS,
        timestamp: lock.start,
      });
      expect(balance).to.equal(estimate);
    }
  });

  let startTime;
  it("should check history changes", async function () {
    const changes = [];
    startTime = parseInt(await time.latest());
    const ONE_WEEK = parseInt(time.duration.weeks(1));

    for (let it = 0; it < 10; ++it) {
      for (const info of userLockInfo) {
        const { lockId, updates } = info;
        for (const { amount, unlockWeeks } of updates) {
          const lock = await lockTOS.lockedBalances(user.address, lockId);
          const lockStart = parseInt(lock.start);
          const lockEnd = parseInt(lock.end);
          const threeYears = parseInt(time.duration.weeks(155));

          if (amount) {
            if (parseInt(await time.latest()) < lockEnd) {
              await tos.connect(user).approve(lockTOS.address, amount);
              await lockTOS.connect(user).increaseAmount(lockId, amount);
            }
          }
          if (unlockWeeks) {
            const newTime = Math.floor((lockEnd + unlockWeeks * 7 * 24 * 60 * 60) / ONE_WEEK) * ONE_WEEK;
            if (parseInt(await time.latest()) < lockEnd && lockEnd < newTime) {
              if (newTime - lockStart < threeYears) {
                await lockTOS
                  .connect(user)
                  .increaseUnlockTime(lockId, unlockWeeks);
              }
            }
          }

          await time.increase(time.duration.weeks(1));
          changes.push({
            lockId,
            capturedBalance: parseInt(await lockTOS.balanceOfLock(lockId)),
            captureTimestamp: parseInt(await time.latest()),
          });
        }
      }
    }

    for (const change of changes) {
      const { lockId, captureTimestamp, capturedBalance } = change;
      const lockBalance = parseInt(
        await lockTOS.balanceOfLockAt(lockId, captureTimestamp)
      );
      expect(lockBalance).to.be.equal(capturedBalance);
    }
  });

  it("should check total supply now", async function () {
    const now = parseInt(await time.latest());
    for (
      let cur = startTime;
      cur <= now;
      cur += parseInt(time.duration.weeks(1))
    ) {
      const totalSupplyAt = parseInt(await lockTOS.totalSupplyAt(cur));
      expect(totalSupplyAt).to.greaterThan(0);
    }
  });

  it("should withdraw for user", async function () {
    let accTos = 0;
    const initialBalance = parseInt(await tos.balanceOf(user.address));
    for (const info of userLockInfo) {
      const { lockId } = info;
      const lock = await lockTOS.lockedBalances(user.address, lockId);
      if (parseInt(lock.end) > parseInt(await time.latest())) {
        await time.increaseTo(parseInt(lock.end));
      }

      accTos += parseInt(lock.amount);
      await (await lockTOS.connect(user).withdraw(lockId)).wait();
      expect((await tos.balanceOf(user.address)) - initialBalance).to.be.equal(
        accTos
      );
    }
  });
});
