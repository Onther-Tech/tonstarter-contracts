const { time, expectEvent } = require("@openzeppelin/test-helpers");
//const { ethers } = require("ethers");
const { ethers } = require("hardhat");
const utils = ethers.utils;
const {POOL_BYTECODE_HASH, computePoolAddress } = require('./computePoolAddress.js');
const StakeUniswapV3 = require("@uniswap/v3-periphery/artifacts/contracts/libraries/PoolAddress.sol/PoolAddress.json");


const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json');

const BN = require("bn.js");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { expect, assert} = chai;
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

const {
  defaultSender,
  accounts,
  contract,
  web3,
  privateKeys,
} = require("@openzeppelin/test-environment");

const {
  deployedUniswapV3Contracts,
  FeeAmount,
  TICK_SPACINGS,
  getMinTick,
  getMaxTick,
  getNegativeOneTick,
  getPositiveOneMaxTick,
  encodePriceSqrt,
  getUniswapV3Pool,
  getBlock,
  mintPosition2,
  getTick
  // getMaxLiquidityPerTick,
} = require("../uniswap-v3-stake/uniswap-v3-contracts");

const {
  ICO20Contracts,
  PHASE2_ETHTOS_Staking,
  PHASE2_MINING_PERSECOND,
  HASH_PHASE2_ETHTOS_Staking
  } = require("../../utils/ico_test_deploy_ethers.js");

const {
  getAddresses,
  findSigner,
  setupContracts,
  mineBlocks,
} = require("../hardhat-test/utils");

const {
  timeout
  } = require("../common.js");

const Web3EthAbi = require('web3-eth-abi');
const abiDecoder = require('abi-decoder');

let deployedUniswapV3;
let ico20Contracts;
let TokamakContractsDeployed;
let ICOContractsDeployed;
let pool_wton_tos_address ;
const zeroAddress = "0x0000000000000000000000000000000000000000";
let vaultAddress = null;
let stakeContractAddress = null;
let deployer ;
let tokenId_First, tokenId_second;
let TestStakeUniswapV3, TestStake2Vault;
let secondsPerMining ;

let tester1 = {
  account: null,
  wtonAmount: null,
  tosAmount: null,
  amount0Desired: null,
  amount1Desired: null,
  tokens: [],
  wtonbalanceBefore:0,
  tosbalanceBefore:0
}
let tester2 = {
  account: null,
  wtonAmount: null,
  tosAmount: null,
  amount0Desired: null,
  amount1Desired: null,
  tokens: [],
  wtonbalanceBefore:0,
  tosbalanceBefore:0
}

describe(" StakeUniswapV3 ", function () {
  let sender;
  let usersInfo;
  let tos, stakeregister, stakefactory, stake1proxy, stake1logic;
  let vault_phase1_eth, vault_phase1_ton, vault_phase1_tosethlp, vault_phase1_dev;
  let ton, wton, depositManager, seigManager;
  let stakeEntry, stakeEntry2, layer2, stakeUniswapV3Factory, stakeUniswapV3,
      stake2Logic, stake2Vault, stakeVaultFactory;
  let Stake2Logic, StakeUniswapV3, StakeUniswapV3Factory, Stake2Vault;

  const stakeType = "2"; // stake type for uniswapV3 stake

  let setup;
  let nftPositionManager, weth;
  let accountlist;
  let user1, user2, user3;
  let defaultSender ;
  let owner  ;
  let sqrtPrice ;

  before(async () => {
    ico20Contracts = new ICO20Contracts();
    accountlist = await getAddresses();

    defaultSender = accountlist[0];
    user1 = accountlist[1];
    user2 = accountlist[2];
    user3 = accountlist[3];

    sender = await ico20Contracts.findSigner(defaultSender);
    tester1.account = await ico20Contracts.findSigner(user1);
    tester2.account = await ico20Contracts.findSigner(user2);
    owner = sender;

    tester1.wtonAmount = ethers.utils.parseUnits('1000', 18);
    tester1.tosAmount = ethers.utils.parseUnits('1000', 18);
    tester1.amount0Desired = ethers.utils.parseUnits('50', 18);
    tester1.amount1Desired = ethers.utils.parseUnits('50', 18);


    tester2.wtonAmount = ethers.utils.parseUnits('1000', 18);
    tester2.tosAmount = ethers.utils.parseUnits('1000', 18);
    tester2.amount0Desired = ethers.utils.parseUnits('300', 18);
    tester2.amount1Desired = ethers.utils.parseUnits('300', 18);

    sqrtPrice = encodePriceSqrt(1, 1);
  });

  describe('# 1. Deploy UniswapV3', async function () {

    it("deployedUniswapV3Contracts", async function () {
      this.timeout(1000000);

      deployedUniswapV3  = await deployedUniswapV3Contracts(defaultSender);
      nftPositionManager = deployedUniswapV3.nftPositionManager;
      // console.log('nftPositionManager', deployedUniswapV3.nftPositionManager.address );
      // console.log('nftDescriptor', deployedUniswapV3.nftDescriptor.address );
      // console.log('weth', deployedUniswapV3.weth.address );
      // console.log('swapRouter', deployedUniswapV3.swapRouter.address );
      // console.log('coreFactory', deployedUniswapV3.coreFactory.address );
      // console.log('poolAddressLib', deployedUniswapV3.poolAddressLib.address );
      // console.log('tickMathLib', deployedUniswapV3.tickMathLib.address );

    });

  });

  describe('# 2. TONStarter Deployed ', async function () {

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


      await ton.mint(defaultSender, ethers.utils.parseUnits('1000', 18), { from: defaultSender });
      await wton.mint(defaultSender, ethers.utils.parseUnits('1000', 18), { from: defaultSender });

      await wton.mint(tester1.account.address, tester1.wtonAmount,  { from: defaultSender });
      await wton.mint(tester2.account.address, tester2.wtonAmount,  { from: defaultSender });

    });

    it("3. Set StakeProxy ", async function () {
      this.timeout(1000000);
      stakeEntry = await ico20Contracts.setEntryExceptUniswap(defaultSender);

      const cons = await ico20Contracts.getICOContracts();
      stakeregister = cons.stakeregister;
      tos = cons.tos;
      stakefactory = cons.stakefactory;
      stake1proxy = cons.stake1proxy;
      stake1logic = cons.stake1logic;

      await stakeregister.addDefiInfo(
        "UNISWAP_V3",
        deployedUniswapV3.swapRouter.address,
        deployedUniswapV3.nftPositionManager.address,
        deployedUniswapV3.weth.address,
        FeeAmount.LOW,
        zeroAddress
      );

      await tos.mint(tester1.account.address, tester1.tosAmount,  { from: defaultSender });
      await tos.mint(tester2.account.address, tester2.tosAmount,  { from: defaultSender });

    });

  });

  describe('# 3. Regist Stake2Vault with phase=2 ', async function () {

      it("1. addStake2LogicAndVault2Factory for UniswapV3 Staking", async function () {
          this.timeout(1000000);

          stakeEntry2 = await ico20Contracts.addStake2LogicAndVault2Factory(defaultSender)
          const cons = await ico20Contracts.getICOContracts();
          stake2logic = cons.stake2logic;
          stakeUniswapV3Logic = cons.stakeUniswapV3Logic;
          stakeCoinageFactory = cons.stakeCoinageFactory;
          stakeUniswapV3Factory = cons.stakeUniswapV3Factory;
          stakeVaultFactory = cons.stakeVaultFactory;
          stake2vaultlogic = cons.stake2vaultlogic;
      });

  });

  describe('# 4. Phase 2 : Create StakeUniswapV3 ', async function () {

    it("1. Create StakeUniswapV3 Vaults & Stake Contract ", async function () {
        this.timeout(1000000);

        //let balance  = await stakeEntry2.balanceOf(wton.address, defaultSender);

        const cons = await ico20Contracts.getICOContracts();
        stakeVaultFactory = cons.stakeVaultFactory;
        stakeEntry2 = cons.stakeEntry2;
        tos = cons.tos;
        stakefactory = cons.stakefactory;

        let tx = await stakeEntry2.connect(owner).createVault2(
          utils.parseUnits(PHASE2_ETHTOS_Staking, 18),
          utils.parseUnits(PHASE2_MINING_PERSECOND, 0),
          ethers.BigNumber.from("2"),
          HASH_PHASE2_ETHTOS_Staking,
          ethers.BigNumber.from("2"),
          [ deployedUniswapV3.nftPositionManager.address,
            deployedUniswapV3.coreFactory.address,
            wton.address,
            tos.address,
          ],
          "UniswapV3"
        );
        const receipt = await tx.wait();
        //console.log('receipt',receipt);

        for(let i=0; i< receipt.events.length ;i++){
          //console.log('receipt.events[i].event',i, receipt.events[i].event);
          if(receipt.events[i].event == "CreatedStakeContract2" && receipt.events[i].args!=null){
              vaultAddress = receipt.events[i].args.vault;
              stakeContractAddress = receipt.events[i].args.stakeContract;
          }
        }

        const codeAfter = await owner.provider.getCode(vaultAddress)
        expect(codeAfter).to.not.eq('0x')

        if(vaultAddress!=null){
            await tos.connect(owner).mint(
              vaultAddress,
              utils.parseUnits(PHASE2_ETHTOS_Staking, 18)
            );
        }
        expect(await tos.balanceOf(vaultAddress)).to.be.equal(utils.parseUnits(PHASE2_ETHTOS_Staking, 18));

        TestStake2Vault = await ico20Contracts.getContract(
          "Stake2Vault",
          vaultAddress,
          owner.address
        );

        expect(await TestStake2Vault.miningPerSecond()).to.be.equal(utils.parseUnits(PHASE2_MINING_PERSECOND, 0));
        expect(await TestStake2Vault.cap()).to.be.equal(utils.parseUnits(PHASE2_ETHTOS_Staking, 18));
        expect(await TestStake2Vault.stakeType()).to.be.equal(ethers.BigNumber.from("2"));
        expect(await TestStake2Vault.stakeAddress()).to.be.equal(stakeContractAddress);
        expect(await TestStake2Vault.tos()).to.be.equal(tos.address);

    });

     it("2. setStartTimeOfVault2", async function () {
        this.timeout(1000000);
        let startTime = new Date().getTime();
        startTime = Math.floor(startTime/1000);
        startTime = parseInt(startTime);
        await stakeEntry2.setStartTimeOfVault2(vaultAddress, startTime);
        let miningStartTime = await TestStake2Vault.miningStartTime();
        expect(miningStartTime.toString()).to.be.equal(startTime +'');

        TestStakeUniswapV3 = await ico20Contracts.getContract(
          "StakeUniswapV3",
          stakeContractAddress,
          owner.address
        );
        let saleStartTime = await TestStakeUniswapV3.saleStartTime();
        expect(saleStartTime.toString()).to.be.equal(startTime +'');
     });
  });


  describe('# 5. UniswapV3 Pool Setting & Token Creation', () => {
    it('1. pool is created and initialized  ', async () => {

      const expectedAddress = computePoolAddress(
        deployedUniswapV3.coreFactory.address,
        [wton.address, tos.address],
        FeeAmount.MEDIUM
      )

      let code = await sender.provider.getCode(expectedAddress)
      expect(code).to.eq('0x');

      await deployedUniswapV3.coreFactory.connect(sender).createPool(wton.address, tos.address, FeeAmount.MEDIUM)
      await timeout(10);

      const pool = new ethers.Contract(expectedAddress, IUniswapV3PoolABI.abi, sender)

      expect(expectedAddress).to.eq(pool.address);

      await pool.connect(sender).initialize(sqrtPrice);

      await timeout(5);
      code = await sender.provider.getCode(expectedAddress)
      expect(code).to.not.eq('0x')

      pool_wton_tos_address = expectedAddress;

    });

    it('2. createAndInitializePoolIfNecessary ', async () => {
        this.timeout(1000000);
        //await timeout(5);
        console.log('createAndInitializePoolIfNecessary start ');

        await deployedUniswapV3.nftPositionManager.connect(sender).createAndInitializePoolIfNecessary(
          wton.address,
          tos.address,
          FeeAmount.MEDIUM,
          sqrtPrice
        )

        console.log('createAndInitializePoolIfNecessary end');
        //await timeout(10);
     });


     it('3. approve token : tester1 ', async () => {
        this.timeout(1000000);
        let tester = tester1 ;
        tester.wtonbalanceBefore = await wton.balanceOf(tester.account.address);
        tester.tosbalanceBefore = await tos.balanceOf(tester.account.address);

        // console.log('wtonBalance:',wtonBalance.toString());
        // console.log('tosBalance:',tosBalance.toString());

        expect(tester.wtonbalanceBefore).to.be.above(tester.amount0Desired);
        expect(tester.tosbalanceBefore).to.be.above(tester.amount1Desired);
        // console.log('call approve wton & tos');
        // await timeout(5);

        await wton.connect(tester.account).approve(deployedUniswapV3.nftPositionManager.address, tester.wtonbalanceBefore);
        await tos.connect(tester.account).approve(deployedUniswapV3.nftPositionManager.address, tester.tosbalanceBefore);
        //console.log('approve wton & tos');

        //await timeout(5);
        expect(await wton.allowance(tester.account.address,deployedUniswapV3.nftPositionManager.address))
          .to.be.equal(tester.wtonbalanceBefore);
        expect(await tos.allowance(tester.account.address,deployedUniswapV3.nftPositionManager.address))
          .to.be.equal(tester.tosbalanceBefore);
        //console.log('check approve & allowance of wton , tos');

        //await timeout(5);
     });


     it('4. mint : tester1 ', async () => {
        this.timeout(1000000);
        let tester = tester1;

        await timeout(5);
        await deployedUniswapV3.nftPositionManager.connect(tester.account).mint({
          token0: wton.address,
          token1: tos.address,
          tickLower: getNegativeOneTick(TICK_SPACINGS[FeeAmount.MEDIUM]),
          tickUpper: getPositiveOneMaxTick(TICK_SPACINGS[FeeAmount.MEDIUM]),
          fee: FeeAmount.MEDIUM,
          recipient: tester.account.address,
          amount0Desired: tester.amount0Desired,
          amount1Desired: tester.amount1Desired,
          amount0Min: 0,
          amount1Min: 0,
          deadline: 100000000000000,
        })

        //await timeout(3);
        //console.log('5');

        let wtonBalanceAfter = await wton.balanceOf(tester.account.address);
        let tosBalanceAfter = await tos.balanceOf(tester.account.address);
        expect(wtonBalanceAfter).to.be.equal(tester.wtonbalanceBefore.sub(tester.amount0Desired));
        expect(tosBalanceAfter).to.be.equal(tester.tosbalanceBefore.sub(tester.amount0Desired));

        let len = await deployedUniswapV3.nftPositionManager.balanceOf(tester.account.address);

        expect(len).to.be.equal(ethers.BigNumber.from('1'));
        len = parseInt(len.toString());

        // console.log('6');
        for(let i=0; i < len; i++){
            let tokenId = await deployedUniswapV3.nftPositionManager.tokenOfOwnerByIndex(tester.account.address, i );
            tester.tokens.push(tokenId);
        }
        expect(tester.tokens.length).to.be.equal(1);
     });


     it('5. approve  : tester2 ', async () => {
        this.timeout(1000000);
        let tester = tester2 ;
        tester.wtonbalanceBefore = await wton.balanceOf(tester.account.address);
        tester.tosbalanceBefore = await tos.balanceOf(tester.account.address);

        expect(tester.wtonbalanceBefore).to.be.above(tester.amount0Desired);
        expect(tester.tosbalanceBefore).to.be.above(tester.amount1Desired);

        // console.log('call approve wton & tos');
        // await timeout(5);
        await wton.connect(tester.account).approve(deployedUniswapV3.nftPositionManager.address, tester.wtonbalanceBefore);
        await tos.connect(tester.account).approve(deployedUniswapV3.nftPositionManager.address, tester.tosbalanceBefore);
        // console.log('check approve & allowance of wton , tos');
        // await timeout(5);

        expect(await wton.allowance(tester.account.address,deployedUniswapV3.nftPositionManager.address))
          .to.be.equal(tester.wtonbalanceBefore);
        expect(await tos.allowance(tester.account.address,deployedUniswapV3.nftPositionManager.address))
          .to.be.equal(tester.tosbalanceBefore);

     });

     it('6. mint : tester2 ', async () => {
        this.timeout(1000000);
        let tester = tester2 ;
        //await timeout(1);
        await deployedUniswapV3.nftPositionManager.connect(tester.account).mint({
          token0: wton.address,
          token1: tos.address,
          tickLower: getNegativeOneTick(TICK_SPACINGS[FeeAmount.MEDIUM]),
          tickUpper: getPositiveOneMaxTick(TICK_SPACINGS[FeeAmount.MEDIUM]),
          fee: FeeAmount.MEDIUM,
          recipient: tester.account.address,
          amount0Desired: tester.amount0Desired,
          amount1Desired: tester.amount1Desired,
          amount0Min: 0,
          amount1Min: 0,
          deadline: 100000000000000,
        })

        await timeout(1);

        let wtonBalanceAfter = await wton.balanceOf(tester.account.address);
        let tosBalanceAfter = await tos.balanceOf(tester.account.address);

        expect(wtonBalanceAfter).to.be.equal(tester.wtonbalanceBefore.sub(tester.amount0Desired));
        expect(tosBalanceAfter).to.be.equal(tester.tosbalanceBefore.sub(tester.amount0Desired));

        let len = await deployedUniswapV3.nftPositionManager.balanceOf(tester.account.address);

        expect(len).to.be.equal(ethers.BigNumber.from('1'));
        len = parseInt(len.toString());

        // console.log('6');
        for(let i=0; i < len; i++){
            let tokenId = await deployedUniswapV3.nftPositionManager.tokenOfOwnerByIndex(tester.account.address, i );
            tester.tokens.push(tokenId);
        }
        expect(tester.tokens.length).to.be.equal(1);

     });

  });

  describe('# 6. StakeUniswapV3 Of TONStarter ', () => {
    it('1. setMiningIntervalSeconds ', async () => {
      this.timeout(1000000);

      await ico20Contracts.stakeEntry2.connect(owner).setMiningIntervalSeconds(
        stakeContractAddress,
        ethers.BigNumber.from('0'));

      TestStakeUniswapV3 = await ico20Contracts.getContract(
        "StakeUniswapV3",
        stakeContractAddress,
        tester1.account.address
      );

      expect(
        await TestStakeUniswapV3.miningIntervalSeconds()
      ).to.be.equal(ethers.BigNumber.from('0'));

    });

    it('2. stake : fail stake without approve token', async () => {
      this.timeout(1000000);
      await expect(
         TestStakeUniswapV3.connect(tester1.account).stake(tester1.tokens[0])
      ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");

    });

    // it('2. stake : Fail when the current tick is outside the range provided by the token', async () => {

    // });
    // it('3. stake : Fail when pool is locked', async () => {

    // });
    it('3. stake : tester1', async () => {
      this.timeout(1000000);
      let tester = tester1;
      await deployedUniswapV3.nftPositionManager.connect(tester.account).approve(stakeContractAddress, tester.tokens[0]);

      TestStakeUniswapV3 = await ico20Contracts.getContract(
        "StakeUniswapV3",
        stakeContractAddress,
        tester.account.address
      );

      let totalStakedAmountBefore = await TestStakeUniswapV3.totalStakedAmount();

      await TestStakeUniswapV3.connect(tester.account).stake(tester.tokens[0]);
      let depositToken = await TestStakeUniswapV3.depositTokens(tester.tokens[0]);
      let coinageToken = await TestStakeUniswapV3.stakedCoinageTokens(tester.tokens[0]);
      let userTotalStaked = await TestStakeUniswapV3.userTotalStaked(tester.account.address);
      //let totalStakedAmountAfter = await TestStakeUniswapV3.totalStakedAmount();
      // console.log('depositToken owner',depositToken.owner );
      // console.log('depositToken startTime',depositToken.startTime );
      // console.log('depositToken secondsInsideInitial',depositToken.secondsInsideInitial);
      // console.log('depositToken secondsInsideLast',depositToken.secondsInsideLast );

      expect(depositToken.owner).to.be.equal(tester.account.address);

      expect(depositToken.startTime).to.be.equal(coinageToken.startTime);
      expect(depositToken.liquidity).to.be.equal(coinageToken.amount);
      expect(depositToken.secondsInsideInitial).to.be.above(0);
      expect(depositToken.secondsInsideLast).to.be.equal(0);

      expect(userTotalStaked.staked).to.be.equal(true);
      expect(userTotalStaked.totalDepositAmount).to.be.equal(depositToken.liquidity);

      expect(await TestStakeUniswapV3.totalStakers()).to.be.equal(ethers.BigNumber.from('1'));
      expect(await TestStakeUniswapV3.totalTokens()).to.be.equal(ethers.BigNumber.from('1'));
      expect(await TestStakeUniswapV3.totalStakedAmount()).to.be.equal(totalStakedAmountBefore.add(depositToken.liquidity));
    });


    it('4. stake : tester2 ', async () => {
      this.timeout(1000000);
      let tester = tester2;
      await deployedUniswapV3.nftPositionManager.connect(tester.account).approve(stakeContractAddress, tester.tokens[0]);

      TestStakeUniswapV3 = await ico20Contracts.getContract(
        "StakeUniswapV3",
        stakeContractAddress,
        tester.account.address
      );
       let totalStakedAmountBefore = await TestStakeUniswapV3.totalStakedAmount();
      await TestStakeUniswapV3.connect(tester.account).stake(tester.tokens[0]);

      let depositToken = await TestStakeUniswapV3.depositTokens(tester.tokens[0]);
      let coinageToken = await TestStakeUniswapV3.stakedCoinageTokens(tester.tokens[0]);
      let userTotalStaked = await TestStakeUniswapV3.userTotalStaked(tester.account.address);
      //let totalStakedAmountAfter = await TestStakeUniswapV3.totalStakedAmount();
      // console.log('depositToken owner',depositToken.owner );
      // console.log('depositToken startTime',depositToken.startTime );
      // console.log('depositToken secondsInsideInitial',depositToken.secondsInsideInitial);
      // console.log('depositToken secondsInsideLast',depositToken.secondsInsideLast );

      expect(depositToken.owner).to.be.equal(tester.account.address);

      expect(depositToken.startTime).to.be.equal(coinageToken.startTime);
      expect(depositToken.liquidity).to.be.equal(coinageToken.amount);
      expect(depositToken.secondsInsideInitial).to.be.above(0);
      expect(depositToken.secondsInsideLast).to.be.equal(0);

      expect(userTotalStaked.staked).to.be.equal(true);
      expect(userTotalStaked.totalDepositAmount).to.be.equal(depositToken.liquidity);

      expect(await TestStakeUniswapV3.totalStakers()).to.be.equal(ethers.BigNumber.from('2'));
      expect(await TestStakeUniswapV3.totalTokens()).to.be.equal(ethers.BigNumber.from('2'));

      expect(await TestStakeUniswapV3.totalStakedAmount()).to.be.equal(totalStakedAmountBefore.add(depositToken.liquidity));
    });


    // it('3. stakePermit : if sig is wrong , fail ', async () => {

    // });

    // it('4. stakePermit   ', async () => {
    // });

    it('5. miningCoinage :  ', async () => {
      this.timeout(1000000);
      let coinageLastMintBlockTimetampBefore = await TestStakeUniswapV3.coinageLastMintBlockTimetamp();
      let canBalanceBefore = await TestStakeUniswapV3.canMiningAmountTokenId(tester1.tokens[0]);

      await TestStakeUniswapV3.connect(tester1.account).miningCoinage();

      let canBalanceAfter = await TestStakeUniswapV3.canMiningAmountTokenId(tester1.tokens[0]);
      let coinageLastMintBlockTimetampAfter = await TestStakeUniswapV3.coinageLastMintBlockTimetamp();
      expect(canBalanceAfter.balanceOfRayTokenId).to.be.above(canBalanceBefore.balanceOfRayTokenId);
      expect(coinageLastMintBlockTimetampBefore).to.be.lt(coinageLastMintBlockTimetampAfter);
    });

    it('6. claim : tester1 ', async () => {
      this.timeout(1000000);
      let tester = tester1;
      let vaultAddressBalance = await tos.balanceOf(vaultAddress);
      // console.log('vaultAddressBalance',utils.formatUnits(vaultAddressBalance.toString(), 18) );

      let tosBalanceBefore = await tos.balanceOf(tester.account.address);
      let miningInfosBefore = await TestStakeUniswapV3.getMiningTokenId(tester.tokens[0]);
      expect(miningInfosBefore.miningAmount).to.be.above(ethers.BigNumber.from('0'));

      // expect(miningInfosBefore.minableAmount.add(ethers.BigNumber.from('1'))).to.be.lte(
      //   miningInfosBefore.secondsInsideDiff.mul(ethers.BigNumber.from(PHASE2_MINING_PERSECOND+''))
      // );
      let minableAmount = miningInfosBefore.minableAmount.toString();

      // console.log('miningInfosBefore miningAmount',miningInfosBefore.miningAmount.toString());
      // console.log('miningInfosBefore nonMiningAmount',miningInfosBefore.nonMiningAmount.toString());
      // console.log('miningInfosBefore minableAmount',miningInfosBefore.minableAmount.toString());
      // console.log('miningInfosBefore secondsInside',miningInfosBefore.secondsInside.toString());
      // console.log('miningInfosBefore secondsInsideDiff',miningInfosBefore.secondsInsideDiff.toString());
      // console.log('miningInfosBefore liquidity',miningInfosBefore.liquidity.toString());
      // console.log('miningInfosBefore balanceOfTokenIdRay',miningInfosBefore.balanceOfTokenIdRay.toString());
      // console.log('miningInfosBefore minableAmountRay',miningInfosBefore.minableAmountRay.toString());
      // console.log('miningInfosBefore currentTime',miningInfosBefore.currentTime );

      await TestStakeUniswapV3.connect(tester.account).claim(tester.tokens[0]);

      let tosBalanceAfter = await tos.balanceOf(tester.account.address);
      let miningInfosAfter = await TestStakeUniswapV3.getMiningTokenId(tester.tokens[0]);

      // console.log('miningInfosAfter miningAmount',miningInfosAfter.miningAmount.toString());
      // console.log('miningInfosAfter nonMiningAmount',miningInfosAfter.nonMiningAmount.toString());
      // console.log('miningInfosAfter minableAmount',miningInfosAfter.minableAmount.toString());
      // console.log('miningInfosAfter secondsInside',miningInfosAfter.secondsInside.toString());
      // console.log('miningInfosAfter secondsInsideDiff',miningInfosAfter.secondsInsideDiff.toString());
      // console.log('miningInfosAfter liquidity',miningInfosAfter.liquidity.toString());
      // console.log('miningInfosAfter balanceOfTokenIdRay',miningInfosAfter.balanceOfTokenIdRay.toString());
      // console.log('miningInfosAfter minableAmountRay',miningInfosAfter.minableAmountRay.toString());
      // console.log('miningInfosAfter currentTime',miningInfosAfter.currentTime );

      // 마이닝하고 나면 마이닝 할수있는 금액은 0이된다.
      expect(miningInfosAfter.miningAmount).to.be.equal(ethers.BigNumber.from('0'));
      // 토스잔액은 마이닝된 금액이 더해진다.
      expect(tosBalanceBefore.add(miningInfosBefore.miningAmount))
        .to.be.equal(tosBalanceAfter);

      let depositToken = await TestStakeUniswapV3.depositTokens(tester.tokens[0]);
      let coinageToken = await TestStakeUniswapV3.stakedCoinageTokens(tester.tokens[0]);
      let userTotalStaked = await TestStakeUniswapV3.userTotalStaked(tester.account.address);


      // console.log('depositToken claimedTime',depositToken.claimedTime );
      // console.log('depositToken secondsInsideInitial',depositToken.secondsInsideInitial);
      // console.log('depositToken secondsInsideLast',depositToken.secondsInsideLast );

      let secondDiff = depositToken.secondsInsideLast-depositToken.secondsInsideInitial;
      let miningAmountForSecondDiff = secondDiff*PHASE2_MINING_PERSECOND;

      // console.log('miningAmountForSecondDiff',miningAmountForSecondDiff );
      // console.log('userTotalStaked totalDepositAmount',userTotalStaked.totalDepositAmount.toString() );
      // console.log('userTotalStaked totalMiningAmount',userTotalStaked.totalMiningAmount.toString() );
      // console.log('userTotalStaked totalNonMiningAmount',userTotalStaked.totalNonMiningAmount.toString() );

      // console.log('coinageToken claimedAmount',coinageToken.claimedAmount.toString() );
      // console.log('coinageToken nonMiningAmount',coinageToken.nonMiningAmount.toString() );

      // 마이닝가능금액은 유동성을 제공한 초*초당마이닝 양보다 작다. 마이닝금액을 다른 사람과 같이 나눠가지므로,
      expect(ethers.BigNumber.from(minableAmount)).to.be.lte(ethers.BigNumber.from(miningAmountForSecondDiff+''));
      // 디파짓 클래임타임과 코인에이지 클래임타임은 같다.
      expect(depositToken.claimedTime).to.be.equal(coinageToken.claimedTime);
      // 나의 총 마이닝 금액은 코인에이지에서 마이닝한 금액이다.
      expect(userTotalStaked.totalMiningAmount).to.be.equal(coinageToken.claimedAmount);
      // 나의 총 마이닝 못한 금액은 코인에이지에서 마이닝 못한 금액이다.
      expect(userTotalStaked.totalNonMiningAmount).to.be.equal(coinageToken.nonMiningAmount);

    });

    it('7. claim : tester2 ', async () => {
      this.timeout(1000000);
      let tester = tester2;
      let vaultAddressBalance = await tos.balanceOf(vaultAddress);

      let tosBalanceBefore = await tos.balanceOf(tester.account.address);
      let miningInfosBefore = await TestStakeUniswapV3.getMiningTokenId(tester.tokens[0]);

      // console.log('miningInfosBefore miningAmount',miningInfosBefore.miningAmount.toString());
      // console.log('miningInfosBefore nonMiningAmount',miningInfosBefore.nonMiningAmount.toString());
      // console.log('miningInfosBefore minableAmount',miningInfosBefore.minableAmount.toString());
      // console.log('miningInfosBefore secondsInside',miningInfosBefore.secondsInside.toString());
      // console.log('miningInfosBefore secondsInsideDiff',miningInfosBefore.secondsInsideDiff.toString());
      // console.log('miningInfosBefore liquidity',miningInfosBefore.liquidity.toString());
      // console.log('miningInfosBefore balanceOfTokenIdRay',miningInfosBefore.balanceOfTokenIdRay.toString());
      // console.log('miningInfosBefore minableAmountRay',miningInfosBefore.minableAmountRay.toString());
      // console.log('miningInfosBefore currentTime',miningInfosBefore.currentTime );

      // 클래임하기 전에는 마이닝 가능금액이 0보다 크다.
      expect(miningInfosBefore.miningAmount).to.be.above(ethers.BigNumber.from('0'));

      // expect(miningInfosBefore.minableAmount.add(ethers.BigNumber.from('1'))).to.be.lte(
      //   miningInfosBefore.secondsInsideDiff.mul(ethers.BigNumber.from(PHASE2_MINING_PERSECOND+''))
      // );
      let minableAmount = miningInfosBefore.minableAmount.toString();

      await TestStakeUniswapV3.connect(tester.account).claim(tester.tokens[0]);

      let tosBalanceAfter = await tos.balanceOf(tester.account.address);
      let miningInfosAfter = await TestStakeUniswapV3.getMiningTokenId(tester.tokens[0]);

      // 클래임을 하고 난후의 마이닝 금액은 0이 된다.
      expect(miningInfosAfter.miningAmount).to.be.equal(ethers.BigNumber.from('0'));
      expect(tosBalanceBefore.add(miningInfosBefore.miningAmount))
        .to.be.equal(tosBalanceAfter);

      let depositToken = await TestStakeUniswapV3.depositTokens(tester.tokens[0]);
      let coinageToken = await TestStakeUniswapV3.stakedCoinageTokens(tester.tokens[0]);
      let userTotalStaked = await TestStakeUniswapV3.userTotalStaked(tester.account.address);

      // console.log('depositToken claimedTime',depositToken.claimedTime );
      // console.log('depositToken secondsInsideInitial',depositToken.secondsInsideInitial.toString());
      // console.log('depositToken secondsInsideLast',depositToken.secondsInsideLast.toString() );

      let secondDiff = ethers.BigNumber.from(depositToken.secondsInsideLast.toString())
        .sub(ethers.BigNumber.from(depositToken.secondsInsideInitial.toString()));

      //console.log('secondDiff',secondDiff.toNumber() , 'PHASE2_MINING_PERSECOND :', PHASE2_MINING_PERSECOND );
      let miningAmountForSecondDiff = secondDiff.toNumber() * PHASE2_MINING_PERSECOND;

      // console.log('miningAmountForSecondDiff',miningAmountForSecondDiff );
      // console.log('userTotalStaked totalDepositAmount',userTotalStaked.totalDepositAmount.toString() );
      // console.log('userTotalStaked totalMiningAmount',userTotalStaked.totalMiningAmount.toString() );
      // console.log('userTotalStaked totalNonMiningAmount',userTotalStaked.totalNonMiningAmount.toString() );

      // console.log('coinageToken claimedAmount',coinageToken.claimedAmount.toString() );
      // console.log('coinageToken nonMiningAmount',coinageToken.nonMiningAmount.toString() );

      expect(ethers.BigNumber.from(minableAmount)).to.be.lte(ethers.BigNumber.from(miningAmountForSecondDiff+''));
      expect(depositToken.claimedTime).to.be.equal(coinageToken.claimedTime);
      expect(userTotalStaked.totalMiningAmount).to.be.equal(coinageToken.claimedAmount);
      expect(userTotalStaked.totalNonMiningAmount).to.be.equal(coinageToken.nonMiningAmount);

    });

    it('8. miningCoinage :  ', async () => {
      this.timeout(1000000);
      await timeout(5);
      let coinageLastMintBlockTimetampBefore = await TestStakeUniswapV3.coinageLastMintBlockTimetamp();
      let canBalanceBefore = await TestStakeUniswapV3.canMiningAmountTokenId(tester1.tokens[0]);

      // 마이닝
      await TestStakeUniswapV3.connect(tester1.account).miningCoinage();

      let canBalanceAfter = await TestStakeUniswapV3.canMiningAmountTokenId(tester1.tokens[0]);
      let coinageLastMintBlockTimetampAfter = await TestStakeUniswapV3.coinageLastMintBlockTimetamp();

      //마이닝을 하면, 마이닝 가능 금액이 늘어난다.
      expect(canBalanceAfter.balanceOfRayTokenId).to.be.above(canBalanceBefore.balanceOfRayTokenId);
      // 마이닝을 하면 코인에이지의 최근 마이닝한 타임이 증가된다.
      expect(coinageLastMintBlockTimetampBefore).to.be.lt(coinageLastMintBlockTimetampAfter);
    });

    it('9. withdraw : tester1 ', async () => {
      this.timeout(1000000);

      let tester = tester1 ;
      let totalStakedAmountBefore = await TestStakeUniswapV3.totalStakedAmount();
      let totalTokensBefore = await TestStakeUniswapV3.totalTokens();
      let miningAmountTotalBefore = await TestStakeUniswapV3.miningAmountTotal();
      let nonMiningAmountTotalBefore = await TestStakeUniswapV3.nonMiningAmountTotal();

      let depositTokenBefore = await TestStakeUniswapV3.depositTokens(tester.tokens[0]);

      let miningInfosBefore = await TestStakeUniswapV3.getMiningTokenId(tester.tokens[0]);
      // console.log('miningInfosBefore miningAmount',miningInfosBefore.miningAmount.toString());
      // console.log('miningInfosBefore nonMiningAmount',miningInfosBefore.nonMiningAmount.toString());
      // console.log('miningInfosBefore minableAmount',miningInfosBefore.minableAmount.toString());
      // console.log('miningInfosBefore secondsInside',miningInfosBefore.secondsInside.toString());
      // console.log('miningInfosBefore secondsInsideDiff',miningInfosBefore.secondsInsideDiff.toString());
      // console.log('miningInfosBefore liquidity',miningInfosBefore.liquidity.toString());
      // console.log('miningInfosBefore balanceOfTokenIdRay',miningInfosBefore.balanceOfTokenIdRay.toString());
      // console.log('miningInfosBefore minableAmountRay',miningInfosBefore.minableAmountRay.toString());
      // console.log('miningInfosBefore currentTime',miningInfosBefore.currentTime );


      // 인출전 마이닝금액은 0보다 크다.
      expect(miningInfosBefore.miningAmount).to.be.above(ethers.BigNumber.from('0'));


      await TestStakeUniswapV3.connect(tester.account).withdraw(tester.tokens[0]);

      let depositToken = await TestStakeUniswapV3.depositTokens(tester.tokens[0]);
      let coinageToken = await TestStakeUniswapV3.stakedCoinageTokens(tester.tokens[0]);
      let userTotalStaked = await TestStakeUniswapV3.userTotalStaked(tester.account.address);

      // 예치토큰 정보가 초기화가 된다.
      expect(depositToken.owner).to.be.equal(zeroAddress);
      expect(depositToken.liquidity).to.be.equal(ethers.BigNumber.from('0'));
      expect(depositToken.startTime).to.be.equal(ethers.BigNumber.from('0'));
      expect(coinageToken.amount).to.be.equal(ethers.BigNumber.from('0'));
      expect(coinageToken.startTime).to.be.equal(ethers.BigNumber.from('0'));
      expect(coinageToken.claimedAmount).to.be.equal(ethers.BigNumber.from('0'));

      // 사용자의 예치토큰이 없으면 staked 는 false 가 된다.
      expect(userTotalStaked.staked).to.be.equal(false);
      // 사용자의 총 예치금액이 0이 된다.
      expect(userTotalStaked.totalDepositAmount).to.be.equal(ethers.BigNumber.from('0'));

      let totalStakedAmountAfter = await TestStakeUniswapV3.totalStakedAmount();
      let totalTokensAfter = await TestStakeUniswapV3.totalTokens();
      let miningAmountTotalAfter = await TestStakeUniswapV3.miningAmountTotal();
      let nonMiningAmountTotalAfter = await TestStakeUniswapV3.nonMiningAmountTotal();

      // console.log('miningInfosBefore miningAmount',miningInfosBefore.miningAmount.toString());
      // console.log('miningInfosBefore nonMiningAmount',miningInfosBefore.nonMiningAmount.toString());

      // 총 스테이크 금액에서 인출금액이 감소된다.
      expect(totalStakedAmountAfter).to.be.equal(totalStakedAmountBefore.sub(depositTokenBefore.liquidity));
      // 총 토큰수에서 1이 감소된다.
      expect(totalTokensAfter).to.be.equal(totalTokensBefore.sub(ethers.BigNumber.from('1')));
      //expect(miningAmountTotalAfter).to.be.equal(miningAmountTotalBefore.add(miningInfosBefore.miningAmount));
      //expect(nonMiningAmountTotalAfter).to.be.equal(nonMiningAmountTotalBefore.add(miningInfosBefore.nonMiningAmount));
      // console.log('miningAmountTotalAfter',miningAmountTotalAfter.toString());
      // console.log('miningAmountTotalBefore',miningAmountTotalBefore.toString());
      // console.log('miningInfosBefore.miningAmount',miningInfosBefore.miningAmount.toString());

      // console.log('nonMiningAmountTotalAfter',nonMiningAmountTotalAfter.toString());
      // console.log('nonMiningAmountTotalBefore',nonMiningAmountTotalBefore.toString());
      // console.log('miningInfosBefore.nonMiningAmount',miningInfosBefore.nonMiningAmount.toString());

      let miningInfosAfter = await TestStakeUniswapV3.getMiningTokenId(tester.tokens[0]);

      // 토큰의 마이닝할 수 있는 정보가 초기화가 된다.
      expect(miningInfosAfter.miningAmount).to.be.equal(ethers.BigNumber.from('0'));
      expect(miningInfosAfter.nonMiningAmount).to.be.equal(ethers.BigNumber.from('0'));
      expect(miningInfosAfter.minableAmount).to.be.equal(ethers.BigNumber.from('0'));
      expect(miningInfosAfter.secondsInside).to.be.equal(ethers.BigNumber.from('0'));
      expect(miningInfosAfter.minableAmountRay).to.be.equal(ethers.BigNumber.from('0'));
    });
     it('10. withdraw : tester2 ', async () => {
      this.timeout(1000000);

      let tester = tester2 ;
      let totalStakedAmountBefore = await TestStakeUniswapV3.totalStakedAmount();
      let totalTokensBefore = await TestStakeUniswapV3.totalTokens();
      let miningAmountTotalBefore = await TestStakeUniswapV3.miningAmountTotal();
      let nonMiningAmountTotalBefore = await TestStakeUniswapV3.nonMiningAmountTotal();

      let depositTokenBefore = await TestStakeUniswapV3.depositTokens(tester.tokens[0]);

      let miningInfosBefore = await TestStakeUniswapV3.getMiningTokenId(tester.tokens[0]);
      // console.log('miningInfosBefore miningAmount',miningInfosBefore.miningAmount.toString());
      // console.log('miningInfosBefore nonMiningAmount',miningInfosBefore.nonMiningAmount.toString());
      // console.log('miningInfosBefore minableAmount',miningInfosBefore.minableAmount.toString());
      // console.log('miningInfosBefore secondsInside',miningInfosBefore.secondsInside.toString());
      // console.log('miningInfosBefore secondsInsideDiff',miningInfosBefore.secondsInsideDiff.toString());
      // console.log('miningInfosBefore liquidity',miningInfosBefore.liquidity.toString());
      // console.log('miningInfosBefore balanceOfTokenIdRay',miningInfosBefore.balanceOfTokenIdRay.toString());
      // console.log('miningInfosBefore minableAmountRay',miningInfosBefore.minableAmountRay.toString());
      // console.log('miningInfosBefore currentTime',miningInfosBefore.currentTime );


      // 인출전 마이닝금액은 0보다 크다.
      expect(miningInfosBefore.miningAmount).to.be.above(ethers.BigNumber.from('0'));


      await TestStakeUniswapV3.connect(tester.account).withdraw(tester.tokens[0]);

      let depositToken = await TestStakeUniswapV3.depositTokens(tester.tokens[0]);
      let coinageToken = await TestStakeUniswapV3.stakedCoinageTokens(tester.tokens[0]);
      let userTotalStaked = await TestStakeUniswapV3.userTotalStaked(tester.account.address);

      // 예치토큰 정보가 초기화가 된다.
      expect(depositToken.owner).to.be.equal(zeroAddress);
      expect(depositToken.liquidity).to.be.equal(ethers.BigNumber.from('0'));
      expect(depositToken.startTime).to.be.equal(ethers.BigNumber.from('0'));
      expect(coinageToken.amount).to.be.equal(ethers.BigNumber.from('0'));
      expect(coinageToken.startTime).to.be.equal(ethers.BigNumber.from('0'));
      expect(coinageToken.claimedAmount).to.be.equal(ethers.BigNumber.from('0'));

      // 사용자의 예치토큰이 없으면 staked 는 false 가 된다.
      expect(userTotalStaked.staked).to.be.equal(false);
      // 사용자의 총 예치금액이 0이 된다.
      expect(userTotalStaked.totalDepositAmount).to.be.equal(ethers.BigNumber.from('0'));

      let totalStakedAmountAfter = await TestStakeUniswapV3.totalStakedAmount();
      let totalTokensAfter = await TestStakeUniswapV3.totalTokens();
      let miningAmountTotalAfter = await TestStakeUniswapV3.miningAmountTotal();
      let nonMiningAmountTotalAfter = await TestStakeUniswapV3.nonMiningAmountTotal();

      // console.log('miningInfosBefore miningAmount',miningInfosBefore.miningAmount.toString());
      // console.log('miningInfosBefore nonMiningAmount',miningInfosBefore.nonMiningAmount.toString());

      // 총 스테이크 금액에서 인출금액이 감소된다.
      expect(totalStakedAmountAfter).to.be.equal(totalStakedAmountBefore.sub(depositTokenBefore.liquidity));
      // 총 토큰수에서 1이 감소된다.
      expect(totalTokensAfter).to.be.equal(totalTokensBefore.sub(ethers.BigNumber.from('1')));

      // console.log('miningAmountTotalAfter',miningAmountTotalAfter.toString());
      // console.log('miningAmountTotalBefore',miningAmountTotalBefore.toString());
      // console.log('miningInfosBefore.miningAmount',miningInfosBefore.miningAmount.toString());

      // console.log('nonMiningAmountTotalAfter',nonMiningAmountTotalAfter.toString());
      // console.log('nonMiningAmountTotalBefore',nonMiningAmountTotalBefore.toString());
      // console.log('miningInfosBefore.nonMiningAmount',miningInfosBefore.nonMiningAmount.toString());

      let miningInfosAfter = await TestStakeUniswapV3.getMiningTokenId(tester.tokens[0]);

      // 토큰의 마이닝할 수 있는 정보가 초기화가 된다.
      expect(miningInfosAfter.miningAmount).to.be.equal(ethers.BigNumber.from('0'));
      expect(miningInfosAfter.nonMiningAmount).to.be.equal(ethers.BigNumber.from('0'));
      expect(miningInfosAfter.minableAmount).to.be.equal(ethers.BigNumber.from('0'));
      expect(miningInfosAfter.secondsInside).to.be.equal(ethers.BigNumber.from('0'));
      expect(miningInfosAfter.minableAmountRay).to.be.equal(ethers.BigNumber.from('0'));
    });

  });




});