// const { BigNumber, utils } = require("ethers")
// const { ethers, upgrades } = require("hardhat")

const { time, expectEvent } = require("@openzeppelin/test-helpers");
const { ethers } = require("ethers");
const BigNumber = ethers.BigNumber; // https://docs.ethers.io/v5/api/utils/bignumber/
const utils = ethers.utils;

const {
  defaultSender,
  accounts,
  contract,
  web3,
  privateKeys,
} = require("@openzeppelin/test-environment");

const [
  candidate1,
  candidate2,
  candidate3,
  user1,
  user2,
  user3,
  user4,
  user5,
  operator1,
  operator2,
] = accounts;
const candidates = [candidate1, candidate2, candidate3];
const users = [user1, user2, user3, user4, user5];
const operators = [operator1, operator2];

// const { expectEvent } = require('openzeppelin-test-helpers');

const BN = require("bn.js");

const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { expect } = chai;
chai.use(require("chai-bn")(BN));
chai.use(solidity);
require("chai").should();

const {
  padLeft,
  toBN,
  toWei,
  fromWei,
  keccak256,
  soliditySha3,
  solidityKeccak256,
} = require("web3-utils");

const { getSignature, signatureValidTime, timeout } = require("./common");

// ------------------------
const {
  ICO20Contracts,
  initialTotal,
  PHASE1_TON_Staking,
  PHASE1_ETH_Staking,
  PHASE1_TOSETHLP_Staking,
  PHASE1_DEV_Mining,
  HASH_PHASE1_TON_Staking,
  HASH_PHASE1_ETH_Staking,
  HASH_PHASE1_TOSETHLP_Staking,
  HASH_PHASE1_DEV_Mining
  } = require("../utils/ico_test_deploy.js");

let ico20Contracts;
let TokamakContractsDeployed;
let ICOContractsDeployed;
let stakeTONUpgrade, stakeTONUpgrade2 ;
// ------------------------
const Stake1Vault = contract.fromArtifact("Stake1Vault");
const StakeTON = contract.fromArtifact("StakeTON");
const StakeTONUpgrade = contract.fromArtifact("StakeTONUpgrade");
const StakeTONUpgrade2 = contract.fromArtifact("StakeTONUpgrade2");
const IERC20 = contract.fromArtifact("IERC20");

const testStakingPeriodBlocks = [50, 100];
const testStakingUsers = [user1, user2];
const testUser1StakingAmount = ["100", "20"];
const testUser2StakingAmount = ["50", "100"];
const testClaimBlock = [20, 60];

let saleStartBlock = 100;
let salePeriod = 50;
let stakingPeriod = 100;
let totalStakedAmount = [];

const zeroAddress = "0x0000000000000000000000000000000000000000";

const ADMIN_ROLE = keccak256("ADMIN");
const MINTER_ROLE = keccak256("MINTER");
const BURNER_ROLE = keccak256("BURNER");
const CLAIMER_ROLE = keccak256("CLAIMER");
const PHASE2_VAULT_HASH = keccak256("PHASE2_VAULT");
const EVENT_VAULT_HASH = keccak256("EVENT_VAULT");

const logFlag = true;

let tokamakStakedInfo = {
  stakedTotal:0,
  tonBalance:0,
  stakeOf:0,
  pendingOf:0
};

let stakeContractTokamak = [];
let unstakingBlock ;
//
describe("TokamakStaker ", function () {
  let weth, tos, stakeregister, stakefactory, stake1proxy, stake1logic;
  let vault_phase1_eth,
    vault_phase1_ton,
    vault_phase1_tosethlp,
    vault_phase1_dev;
  let ton, wton, depositManager, seigManager;
  let stakeEntry, layer2;

  let a1, a2, tokenInfo;
  const sendAmount = "1";

  const testStakingPeriodBlocks = [20, 30];
  const testStakingUsers = [user1, user2];
  const testUser1StakingAmount = ["10", "5"];
  const testUser2StakingAmount = ["10", "20"];
  const testClaimBlock = [5, 10, 5, 5];

  const sendAmountForTest = "1";
  const sendAmountForTest2 = "5";
  const buyTokensEtehrs = ["10", "5", "20", "2"];
  const buyTokensDurations = ["10", "60", "120", "150"];
  let stakeStartBlock = 0;
  let globalWithdrawalDelay = 0;
  let stakeAddresses;
  let requestBlock = 0;

  before(async function () {
    this.timeout(1000000);
    ico20Contracts = new ICO20Contracts();
  });

  describe('# 1. Pre-requisite Setting', async function () {

    it("1. ico20Contracts init  ", async function () {
      this.timeout(1000000);
      ICOContractsDeployed = await ico20Contracts.initializeICO20Contracts(
        defaultSender
      );
    });
    it("2. tokamakContracts init  ", async function () {
      this.timeout(1000000);
      TokamakContractsDeployed =
        await ico20Contracts.initializePlasmaEvmContracts(defaultSender);

      const cons = await ico20Contracts.getPlasamContracts();
      ton = cons.ton;
      wton = cons.wton;
      depositManager = cons.depositManager;
      seigManager = cons.seigManager;
      globalWithdrawalDelay = await depositManager.globalWithdrawalDelay();
    });

    it("3. Set StakeProxy  ", async function () {
      this.timeout(1000000);
      stakeEntry = await ico20Contracts.setEntry(defaultSender);

      const cons = await ico20Contracts.getICOContracts();
      tos = cons.tos;
      stakeregister = cons.stakeregister;
      stakefactory = cons.stakefactory;
      stake1proxy = cons.stake1proxy;
      stake1logic = cons.stake1logic;
    });

    it("4. addOperator on TOKAMAK ", async function () {
      layer2 = await ico20Contracts.addOperator(operator1);
    });

    it("5. Create TON Vault", async function () {
      const current = await time.latestBlock();
      saleStartBlock = parseInt(saleStartBlock.toString());
      saleStartBlock = saleStartBlock + salePeriod;
      stakeStartBlock = saleStartBlock + stakingPeriod;

      const tx = await stakeEntry.createVault(
        ton.address,
        utils.parseUnits(PHASE1_TON_Staking, 18),
        toBN(saleStartBlock),
        toBN(stakeStartBlock),
        toBN("1"),
        HASH_PHASE1_TON_Staking,
        toBN("0"),
        zeroAddress,
        { from: defaultSender }
      );

      const vaultAddress = tx.receipt.logs[tx.receipt.logs.length - 1].args.vault;
      vault_phase1_ton = await Stake1Vault.at(vaultAddress, {
        from: defaultSender,
      });
      await tos.mint(
        vault_phase1_ton.address,
        utils.parseUnits(PHASE1_TON_Staking, 18),
        { from: defaultSender }
      );
    });

    it("6. createStakeContract with TON ", async function () {
      for (let i = 0; i < testStakingPeriodBlocks.length; i++) {
        await stakeEntry.createStakeContract(
          toBN("1"),
          vault_phase1_ton.address,
          tos.address,
          ton.address,
          toBN(testStakingPeriodBlocks[i] + ""),
          "PHASE1_TON_" + testStakingPeriodBlocks[i] + "_BLOCKS",
          { from: defaultSender }
        );
      }

      stakeAddresses = await stakeEntry.stakeContractsOfVault(
        vault_phase1_ton.address
      );

      for(let i = 0; i< stakeAddresses.length; i++){
        stakeContractTokamak.push(tokamakStakedInfo);
      }

    });

    it("7. Stake TON ", async function () {
      this.timeout(1000000);
      let currentBlockTime = parseInt(saleStartBlock);
      await time.advanceBlockTo(currentBlockTime);

      for (let i = 0; i < stakeAddresses.length; i++) {
        if (stakeAddresses[i] != null) {
          const stakeContract = await StakeTON.at(stakeAddresses[i]);

          await ico20Contracts.stake(
            stakeAddresses[i],
            user1,
            toWei(testUser1StakingAmount[i], "ether")
          );
          await ico20Contracts.stake(
            stakeAddresses[i],
            user2,
            toWei(testUser2StakingAmount[i], "ether")
          );

          let contract = await StakeTON.at(stakeAddresses[i]);
          let amount = await contract.totalStakedAmount();
          totalStakedAmount.push(amount);
        }
      }
    });
    it("8. StakeTONUpgrade Deploy", async function () {
      stakeTONUpgrade = await StakeTONUpgrade.new({ from: defaultSender });
      expect(stakeTONUpgrade.address).to.not.eq(zeroAddress);
    });

    it("9. StakeTON upgradeStakeTo ", async function () {
      this.timeout(1000000);

      for (let i = 0; i < stakeAddresses.length; i++) {
        if (stakeAddresses[i] != null) {

          await stakeEntry.upgradeStakeTo(stakeAddresses[i],stakeTONUpgrade.address);

          let contract = await StakeTONUpgrade.at(stakeAddresses[i]);
          let amount = await contract.totalStakedAmount();

          expect(totalStakedAmount[i].toString()).to.be.equal(amount.toString());
        }
      }
    });

    it("10. StakeTONUpgrade stake ", async function () {
      this.timeout(1000000);

      for (let i = 0; i < stakeAddresses.length; i++) {
        if (stakeAddresses[i] != null) {
          let sum = toBN('0');

          await ico20Contracts.stake(
            stakeAddresses[i],
            user1,
            toWei(testUser1StakingAmount[i], "ether")
          );
          await ico20Contracts.stake(
            stakeAddresses[i],
            user2,
            toWei(testUser2StakingAmount[i], "ether")
          );
          sum = sum.add(toBN(toWei(testUser1StakingAmount[i], "ether"))).add(toBN(toWei(testUser2StakingAmount[i], "ether")));

          let contract = await StakeTONUpgrade.at(stakeAddresses[i]);
          let amount = await contract.totalStakedAmount();

          expect(toBN(totalStakedAmount[i]).toString()).to.be.equal(
            toBN(amount).sub(sum).toString());

          totalStakedAmount[i] = amount;
        }
      }
    });

  });

  describe('# 2. Function test : fails when closeSale is not excuted ', async function () {
    it("1. tokamakStaking fails", async function () {

      let testStakeContract = stakeAddresses[0];
      const tonAmount = await ton.balanceOf(testStakeContract);

      await expect(
        stakeEntry.tokamakStaking(
              testStakeContract,
              layer2.address,
              tonAmount,
              { from: defaultSender }
            )
      ).to.be.revertedWith("TokamakStaker: not closed");

    });

    it("2. tokamakRequestUnStaking fails", async function () {
      let wtonAmount = utils.parseUnits('1', 27);
      await expect(
        stakeEntry.tokamakRequestUnStaking(
          stakeAddresses[0],
          layer2.address,
          wtonAmount,
          { from: user1 }
        )
      ).to.be.revertedWith("TokamakStaker: not closed");
    });

    it("3. tokamakProcessUnStaking fails ", async function () {
      await expect(
        stakeEntry.tokamakProcessUnStaking(
          stakeAddresses[0],
          layer2.address,
          { from: user1 }
        )
      ).to.be.revertedWith("TokamakStaker: not closed");
    });
  });

  describe('# 3. Function test after closeSale is excuted ', async function () {

    it("1. closeSale TON Vault ", async function () {
      this.timeout(1000000);
      let currentBlockTime = parseInt(stakeStartBlock);
      await time.advanceBlockTo(currentBlockTime);
      await stakeEntry.closeSale(vault_phase1_ton.address, { from: user1 });
    });

    it("2. tokamakStaking ", async function () {
      this.timeout(1000000);

      for (let i = 0; i < stakeAddresses.length; i++) {
        stakeContractTokamak[i].stakedTotal = await ton.balanceOf(stakeAddresses[i]);

        if (stakeContractTokamak[i].stakedTotal.gt(toBN("0"))) {
          await stakeEntry.tokamakStaking(
            stakeAddresses[i],
            layer2.address,
            stakeContractTokamak[i].stakedTotal,
            { from: defaultSender }
          );

          stakeContractTokamak[i].stakeOf = await seigManager.stakeOf(
            layer2.address,
            stakeAddresses[i]
          );

          await expect(toBN(stakeContractTokamak[i].stakeOf).div(toBN(10**9)).toString())
            .to.be.bignumber.equal(
              toBN(stakeContractTokamak[i].stakedTotal.toString()));
        }
      }
    });

    it("3. updateReward in Tokamak (1) ", async function () {
      this.timeout(1000000);
      let currentBlockTime = parseInt(stakeStartBlock)+100;
      await time.advanceBlockTo(currentBlockTime);
      await ico20Contracts.updateRewardTokamak(layer2, operator1);

      for (let i = 0; i < stakeAddresses.length; i++) {
        let stakeOf = await seigManager.stakeOf(
            layer2.address,
            stakeAddresses[i]
          );

        await expect(toBN(stakeOf).toString())
            .to.be.bignumber.above(
              toBN(stakeContractTokamak[i].stakeOf.toString()));
      }
    });

    it("4. tokamakRequestUnStaking (1) ", async function () {
      this.timeout(1000000);

      let remainAmount = toBN('100000000000000000');
      for (let i = 0; i < stakeAddresses.length; i++) {

        const stakeOfPrev = await seigManager.stakeOf(
          layer2.address,
          stakeAddresses[i]
        );

        let contract = await StakeTONUpgrade.at(stakeAddresses[i]);
        let toTokamak = await contract.toTokamak();
        let totalStakedAmount = await contract.totalStakedAmount();

        let amountOfStake1 = stakeOfPrev.sub(remainAmount);
        let amountOfStake = stakeOfPrev.sub(toTokamak);

        let canUnstakingAmount = await contract.canTokamakRequestUnStaking(layer2.address);

        await stakeEntry.tokamakRequestUnStaking(
          stakeAddresses[i],
          layer2.address,
          amountOfStake1,
          { from: defaultSender }
        );

        const stakeOf = await seigManager.stakeOf(
          layer2.address,
          stakeAddresses[i]
        );

        await expect(toBN(stakeOf).div(toBN(10**9)).toString())
            .to.be.bignumber.equal(toBN(totalStakedAmount).toString());

        stakeContractTokamak[i].stakeOf = stakeOf;

        const pendingOf = await depositManager.pendingUnstaked(
          layer2.address,
          stakeAddresses[i]
        );

        stakeContractTokamak[i].pendingOf = pendingOf;

        await expect(toBN(totalStakedAmount).toString())
            .to.be.bignumber.lt(toBN(pendingOf).add(toBN(stakeOf)).div(toBN(10**9)).toString());

        // await expect(toBN(stakeOf).toString()).to.be.bignumber.equal(remainAmount.toString());

      }

      unstakingBlock = await time.latestBlock();
    });

    it("5. tokamakProcessUnStaking fails : when the globalWithdrawalDelay blocks has not passed ", async function () {
      this.timeout(1000000);

      for (let i = 0; i < stakeAddresses.length; i++) {

         await expect(
           stakeEntry.tokamakProcessUnStaking(
            stakeAddresses[i],
            layer2.address,
            { from: defaultSender }
          )
         ).to.be.revertedWith("DepositManager: wait for withdrawal delay");
      }
    });

    it("6. updateReward in Tokamak (2) ", async function () {
      this.timeout(1000000);
      let currentBlockTime = parseInt(unstakingBlock)+500;
      await time.advanceBlockTo(currentBlockTime);
      await ico20Contracts.updateRewardTokamak(layer2, operator1);

      for (let i = 0; i < stakeAddresses.length; i++) {
        let stakeOf = await seigManager.stakeOf(
            layer2.address,
            stakeAddresses[i]
          );


        await expect(toBN(stakeOf).toString())
            .to.be.bignumber.above(
              toBN(stakeContractTokamak[i].stakeOf.toString()));
      }

      unstakingBlock = currentBlockTime;
    });

    it("7. tokamakRequestUnStaking (2) ", async function () {
      this.timeout(1000000);

      let remainAmount = toBN('100000000000000000');
      for (let i = 0; i < stakeAddresses.length; i++) {

        const stakeOfPrev = await seigManager.stakeOf(
          layer2.address,
          stakeAddresses[i]
        );

        let contract = await StakeTONUpgrade.at(stakeAddresses[i]);
        let toTokamak = await contract.toTokamak();
        let totalStakedAmount = await contract.totalStakedAmount();

        let amountOfStake1 = stakeOfPrev.sub(remainAmount);
        let amountOfStake = stakeOfPrev.sub(toTokamak);

        let canUnstakingAmount = await contract.canTokamakRequestUnStaking(layer2.address);

        await stakeEntry.tokamakRequestUnStaking(
          stakeAddresses[i],
          layer2.address,
          amountOfStake1,
          { from: defaultSender }
        );

        const stakeOf = await seigManager.stakeOf(
          layer2.address,
          stakeAddresses[i]
        );

        await expect(toBN(stakeOf).div(toBN(10**9)).toString())
            .to.be.bignumber.equal(toBN(totalStakedAmount).toString());

        stakeContractTokamak[i].stakeOf = stakeOf;

        const pendingOf = await depositManager.pendingUnstaked(
          layer2.address,
          stakeAddresses[i]
        );

        stakeContractTokamak[i].pendingOf = pendingOf;

        await expect(toBN(totalStakedAmount).toString())
            .to.be.bignumber.lt(toBN(pendingOf).add(toBN(stakeOf)).div(toBN(10**9)).toString());

        // await expect(toBN(stakeOf).toString()).to.be.bignumber.equal(remainAmount.toString());

      }
    });

    it("8. tokamakProcessUnStaking : fail before upgrade2 ", async function () {
      this.timeout(1000000);

      for (let i = 0; i < stakeAddresses.length; i++) {

         await expect(
           stakeEntry.tokamakProcessUnStaking(
            stakeAddresses[i],
            layer2.address,
            { from: defaultSender }
          )
         ).to.be.revertedWith("DepositManager: wait for withdrawal delay");

      }
    });

  });

  describe('# 4. StakeTONUpgrade2 in StakeTONUpgrade', async function () {


    it("1. StakeTONUpgrade2 Deploy", async function () {
      stakeTONUpgrade2 = await StakeTONUpgrade2.new({ from: defaultSender });
      expect(stakeTONUpgrade2.address).to.not.eq(zeroAddress);
    });

    it("2. StakeTONUpgrade upgradeStakeTo ", async function () {
      this.timeout(1000000);

      for (let i = 0; i < stakeAddresses.length; i++) {
        if (stakeAddresses[i] != null) {

          let tx = await stakeEntry.upgradeStakeTo(stakeAddresses[i], stakeTONUpgrade2.address);

          let contract = await StakeTONUpgrade2.at(stakeAddresses[i]);
          let amount = await contract.totalStakedAmount();

          expect(totalStakedAmount[i].toString()).to.be.equal(amount.toString());

          expect(await contract.version()).to.be.equal("phase1.upgrade.v2");
        }
      }
    });
  });

  describe('# 5. tokamakProcessUnStaking ', async function () {

     it("1. tokamakProcessUnStaking : Only those past the delayed block can be processed  ", async function () {
      this.timeout(1000000);
      const delayBlocks = await depositManager.globalWithdrawalDelay();

      let curLatestBlock = await time.latestBlock();

      //await time.advanceBlockTo(parseInt(unstakingBlock) + parseInt(delayBlocks) );


      for (let i = 0; i < stakeAddresses.length; i++) {

        stakeContractTokamak[i].tonBalance = await ton.balanceOf(stakeAddresses[i]);

        /*
        let startIndex = await depositManager.withdrawalRequestIndex(
                layer2.address,
                stakeAddresses[i]
            );

        let numPendingRequests = await depositManager.numPendingRequests(
                layer2.address,
                stakeAddresses[i]
            );
        console.log('numPendingRequests',numPendingRequests.toString());
        */
        let contract = await StakeTONUpgrade2.at(stakeAddresses[i]);
        let canTokamakProcessUnStakingCount = await contract.canTokamakProcessUnStakingCount(layer2.address);
        // console.log('canTokamakProcessUnStakingCount.count',canTokamakProcessUnStakingCount.count.toString());
        // console.log('canTokamakProcessUnStakingCount.amount',canTokamakProcessUnStakingCount.amount.toString());

        stakeContractTokamak[i].tonBalance = toBN(stakeContractTokamak[i].tonBalance).add(toBN(canTokamakProcessUnStakingCount.amount).div(toBN(10**9)));

        await stakeEntry.tokamakProcessUnStaking(
          stakeAddresses[i],
          layer2.address,
          { from: defaultSender }
        );

        let currentTONAmount = await ton.balanceOf(stakeAddresses[i]);

        await expect(stakeContractTokamak[i].tonBalance.toString())
            .to.be.bignumber.equal(toBN(currentTONAmount).toString());


      }
    });


    it("2. tokamakRequestUnStakingAll ", async function () {
      this.timeout(1000000);

      for (let i = 0; i < stakeAddresses.length; i++) {

        let stakeOfPrev = await seigManager.stakeOf(
          layer2.address,
          stakeAddresses[i]
        );

        let pendingOfPrev = await depositManager.pendingUnstaked(
          layer2.address,
          stakeAddresses[i]
        );

        await stakeEntry.tokamakRequestUnStakingAll(
          stakeAddresses[i],
          layer2.address,
          { from: defaultSender }
        );

        const stakeOf = await seigManager.stakeOf(
          layer2.address,
          stakeAddresses[i]
        );

        await expect(toBN(stakeOf).toString())
            .to.be.bignumber.equal(toBN('0').toString());

        stakeContractTokamak[i].pendingOf = await depositManager.pendingUnstaked(
          layer2.address,
          stakeAddresses[i]
        );

        expect(stakeContractTokamak[i].pendingOf
        ).to.be.bignumber.equal(toBN(stakeOfPrev).add(toBN(pendingOfPrev)) );

      }

      unstakingBlock = await time.latestBlock();

    });

    it("3. tokamakProcessUnStaking ", async function () {
      this.timeout(1000000);
      const delayBlocks = await depositManager.globalWithdrawalDelay();
      let latest = await time.latestBlock();
      await time.advanceBlockTo(parseInt(latest) + parseInt(delayBlocks)+1);

      latest = await time.latestBlock();
      //console.log('curBlock:', latest.toString());


      for (let i = 0; i < stakeAddresses.length; i++) {

        stakeContractTokamak[i].tonBalance = await ton.balanceOf(stakeAddresses[i]);
        stakeContractTokamak[i].pendingOf = await depositManager.pendingUnstaked(
          layer2.address,
          stakeAddresses[i]
        );
        /*
        let startIndex = await depositManager.withdrawalRequestIndex(
                layer2.address,
                stakeAddresses[i]
            );
        console.log('startIndex',startIndex.toString());

        let numPendingRequests = await depositManager.numPendingRequests(
                layer2.address,
                stakeAddresses[i]
            );
        console.log('numPendingRequests',numPendingRequests.toString());
        let maxIndex = startIndex.add(numPendingRequests);
        for(let index = startIndex.toNumber(); index < maxIndex.toNumber(); index++){
            let withdrawalRequest = await depositManager.withdrawalRequest(
                layer2.address,
                stakeAddresses[i],
                index
            );
            console.log('withdrawalRequest.withdrawableBlockNumber',withdrawalRequest.withdrawableBlockNumber.toString());
            console.log('withdrawalRequest.amount',withdrawalRequest.amount.toString());
            console.log('withdrawalRequest.processed',withdrawalRequest.processed);
        }

        let contract = await StakeTONUpgrade2.at(stakeAddresses[i]);
        let canTokamakProcessUnStakingCount = await contract.canTokamakProcessUnStakingCount(layer2.address);
        console.log('canTokamakProcessUnStakingCount.count',canTokamakProcessUnStakingCount.count.toString());
        console.log('canTokamakProcessUnStakingCount.amount',canTokamakProcessUnStakingCount.amount.toString());
       // stakeContractTokamak[i].tonBalance = toBN(stakeContractTokamak[i].tonBalance).add(toBN(canTokamakProcessUnStakingCount.amount).div(toBN(10**9)));
        */
        stakeContractTokamak[i].tonBalance = toBN(stakeContractTokamak[i].tonBalance).add(toBN(stakeContractTokamak[i].pendingOf).div(toBN(10**9)));

        await stakeEntry.tokamakProcessUnStaking(
          stakeAddresses[i],
          layer2.address,
          { from: defaultSender }
        );

        let currentTONAmount = await ton.balanceOf(stakeAddresses[i]);

        await expect(stakeContractTokamak[i].tonBalance.toString())
            .to.be.bignumber.equal(toBN(currentTONAmount).toString());

        expect(await depositManager.pendingUnstaked(
          layer2.address,
          stakeAddresses[i])).to.be.bignumber.equal(toBN('0'));

        expect(await seigManager.stakeOf(
          layer2.address,
          stakeAddresses[i])).to.be.bignumber.equal(toBN('0'));

      }
    });

  });

});