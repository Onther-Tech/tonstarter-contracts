const chai = require("chai");
const { expect } = require("chai");

const { solidity } = require("ethereum-waffle");
chai.use(solidity);

const { defaultSender, accounts, contract } = require("@openzeppelin/test-environment");
const { time } = require("@openzeppelin/test-helpers");
const { ICO20Contracts } = require("../utils/ico_test_deploy.js");
const { ethers } = require("ethers");
const { toBN, toWei, keccak256, fromWei } = require("web3-utils");

const PHASE1_ETH_Staking = "175000000." + "0".repeat(18);
const zeroAddress = "0x0000000000000000000000000000000000000000";

const Stake1Vault = contract.fromArtifact("Stake1Vault");
const StakeTON = contract.fromArtifact("StakeTON");
const StakeTONProxy = contract.fromArtifact("StakeTONProxy");
const StakeTONModified = contract.fromArtifact("StakeTONModified");

describe ("Upgradable Stake Contracts", function () {
  const usersInfo = [
    {
      name: "Bob",
      address: accounts[0],
      stakes: [{amount: 100}, {amount: 20}]
    },
    {
      name: "Alice",
      address: accounts[1],
      stakes: [{amount: 50}, {amount: 100}]
    },
  ];

  const ICO20Instances = {};
  let contractsInitializer;
  let Vault;
  let stakeEntry;
  let saleStartBlock, stakeStartBlock;
  saleStartBlock = 100;
  stakeStartBlock = 200;

  const stakingContractInfo = [
    {name: "short staking", period: 50},
    {name: "long staking", period: 100}
  ];

  before(async function () {
    this.timeout(1000000);
    contractsInitializer = new ICO20Contracts();
  });

  it("1. Initialize contracts", async function () {
    this.timeout(1000000);

    await contractsInitializer.initializeICO20Contracts(defaultSender);
    await contractsInitializer.initializePlasmaEvmContracts(defaultSender);

    stakeEntry = await contractsInitializer.setEntry(defaultSender);

    const result = await contractsInitializer.getICOContracts();
    ICO20Instances.tos = result.tos;
    ICO20Instances.stakeRegister = result.stakeregister;
    ICO20Instances.stakeFactory = result.stakefactory;
    ICO20Instances.stake1proxy = result.stake1proxy;
    ICO20Instances.stake1logic = result.stake1logic;
  });

  it('2. should create a vault', async function () {

    const HASH_PHASE1_ETH_Staking = keccak256("PHASE1_ETH_STAKING");
    let phase = toBN('1');
    let stakeType = toBN('0');
    const tx = await stakeEntry.createVault(
      zeroAddress, // ethers
      ethers.utils.parseUnits(PHASE1_ETH_Staking, 18),
      toBN(saleStartBlock),
      toBN(stakeStartBlock),
      toBN('1'),
      HASH_PHASE1_ETH_Staking,
      toBN('1'),
      zeroAddress
      , { from: defaultSender });

    const stakeVaultAddress = tx.receipt.logs[tx.receipt.logs.length - 1].args.vault;
    Vault = await Stake1Vault.at(stakeVaultAddress, { from: defaultSender });
    await ICO20Instances.tos.mint(Vault.address, ethers.utils.parseUnits(PHASE1_ETH_Staking, 18), { from: defaultSender });
  });


  it("3. should create stake contracts", async function () {
    this.timeout(10000000);

    for (const { name, period } of stakingContractInfo) {
      await stakeEntry.createStakeContract(
        toBN("1"), // phase number
        Vault.address, // vault address
        ICO20Instances.tos.address, // tos address
        zeroAddress, // token address - ether
        toBN(period), // staking period
        name, // staking name
        { from: defaultSender }
      );
    }

    // Store stake addresses
    const stakeAddresses = await stakeEntry.stakeContractsOfVault(Vault.address);
    for (let i = 0; i < stakingContractInfo.length; ++i) {
      stakingContractInfo[i].address = stakeAddresses[i];
    }
  });

  it("4. should upgrade stake to invalid contract", async function () {
    this.timeout(10000000);
    const currentBlockTime = parseInt(saleStartBlock);
    await time.advanceBlockTo(currentBlockTime);

    for (let i = 0; i < stakingContractInfo.length; ++i) {
      const { address: stakeAddress } = stakingContractInfo[i];
      const stakeProxy = await StakeTONProxy.at(stakeAddress);
      const stakeContract = await StakeTON.at(stakeAddress);
      const oldImplementationAddress = await stakeProxy.implementation();
      const newImplementation = await StakeTONModified.new({ from: defaultSender }); // random address

      // upgrade to non-working implementation
      await stakeEntry.upgradeStakeTo(stakeAddress, newImplementation.address, { from: defaultSender });

      // try to use it
      for (const user of usersInfo) {
        const { name, address, stakes } = user;
        await expect(
          stakeContract.sendTransaction({
            from: address,
            value: toWei(toBN(stakes[i].amount), "ether"),
          })
        ).to.be.revertedWith("Function cannot be used");
      }

      // upgrade to working implementation
      await stakeEntry.upgradeStakeTo(stakeAddress, oldImplementationAddress);
      for (const user of usersInfo) {
        const { name, address, stakes } = user;
        await stakeContract.sendTransaction({
          from: address,
          value: toWei(toBN(stakes[i].amount), "ether"),
        });
      }
    }
  });

  it("5. should close sale", async function () {
    const current = parseInt(stakeStartBlock);
    await time.advanceBlockTo(current);
    await stakeEntry.closeSale(Vault.address, { from: defaultSender });
  });

  it("6. should claim rewards", async function () {
    this.timeout(10000000);
    const tos = ICO20Instances.tos;

    for (const { claimBlock } of [{claimBlock: 10}, {claimBlock: 60}]) {
      let block = stakeStartBlock + claimBlock;
      await time.advanceBlockTo(block - 1);
      for (const { name: stakeName, address: stakeAddress, period: stakePeriod } of stakingContractInfo) {
        const stakeContract = await StakeTON.at(stakeAddress);
        const prevRewardClaimedTotal = await stakeContract.rewardClaimedTotal();
        let sum = toBN(prevRewardClaimedTotal.toString());

        for (const { address: userAddress } of usersInfo) {
          const reward = await stakeContract.canRewardAmount(userAddress, block);
          const tosBalance = await tos.balanceOf(userAddress);
          await stakeContract.claim({ from: userAddress });
          block++;
          sum = sum.add(toBN(reward.toString()));

          const newTosBalance = await tos.balanceOf(userAddress);

          await expect(reward.add(tosBalance)).to.be.bignumber.equal(newTosBalance);

          const rewardClaimedTotal = await stakeContract.rewardClaimedTotal();

          await expect(sum.toString()).to.be.bignumber.equal(toBN(rewardClaimedTotal).toString());

          const { amount, claimedAmount } = await stakeContract.userStaked(userAddress);
          //console.log({ amount: amount.toString(), claimedAmount: claimedAmount.toString() });
        }
      }
    }
  });
});