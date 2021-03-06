const { time, expectEvent } = require("@openzeppelin/test-helpers");
// const { ethers } = require("ethers");
const { ethers } = require("hardhat");
const utils = ethers.utils;
const {
  POOL_BYTECODE_HASH,
  computePoolAddress,
} = require("./computePoolAddress.js");
const StakeUniswapV3 = require("@uniswap/v3-periphery/artifacts/contracts/libraries/PoolAddress.sol/PoolAddress.json");

const IUniswapV3PoolABI = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");

const BN = require("bn.js");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { expect, assert } = chai;
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
  getTick,
  // getMaxLiquidityPerTick,
} = require("../uniswap-v3-stake/uniswap-v3-contracts");

const {
  ICO20Contracts,
  PHASE2_ETHTOS_Staking,
  PHASE2_MINING_PERSECOND,
  HASH_PHASE2_ETHTOS_Staking,
} = require("../../utils/ico_test_deploy_ethers.js");

const {
  getAddresses,
  findSigner,
  setupContracts,
  mineBlocks,
} = require("../hardhat-test/utils");

const { timeout } = require("../common.js");

const Web3EthAbi = require("web3-eth-abi");
const abiDecoder = require("abi-decoder");

let deployedUniswapV3;
let ico20Contracts;
let TokamakContractsDeployed;
let ICOContractsDeployed;
let pool_wton_tos_address;
const zeroAddress = "0x0000000000000000000000000000000000000000";
let vaultAddress = null;
let stakeContractAddress = null;
let deployer;
let tokenId_First, tokenId_second;
let TestStakeUniswapV3, TestStake2Vault;
let secondsPerMining;
let alignPair = 1;

const tester1 = {
  account: null,
  wtonAmount: null,
  tosAmount: null,
  amount0Desired: null,
  amount1Desired: null,
  tokens: [],
  positions: [],
  wtonbalanceBefore: 0,
  tosbalanceBefore: 0,
  miningTimeLast: 0,
};
const tester2 = {
  account: null,
  wtonAmount: null,
  tosAmount: null,
  amount0Desired: null,
  amount1Desired: null,
  tokens: [],
  positions: [],
  wtonbalanceBefore: 0,
  tosbalanceBefore: 0,
  miningTimeLast: 0,
};

function getAlignedPair(_token0, _token1) {
  let token0 = _token0;
  let token1 = _token1;
  if (token0 > token1) {
    token0 = _token1;
    token1 = _token0;
    alignPair = 0;
  }

  return [token0, token1];
}
describe(" StakeUniswapV3 ", function () {
  let sender;
  let usersInfo;
  let tos, stakeregister, stakefactory, stake1proxy, stake1logic;
  let vault_phase1_eth,
    vault_phase1_ton,
    vault_phase1_tosethlp,
    vault_phase1_dev;
  let ton, wton, depositManager, seigManager;
  let stakeEntry,
    stakeEntry2,
    layer2,
    stakeUniswapV3Factory,
    stakeUniswapV3,
    stake2Logic,
    stake2Vault,
    stakeVaultFactory;
  let Stake2Logic, StakeUniswapV3, StakeUniswapV3Factory, Stake2Vault;

  const stakeType = "2"; // stake type for uniswapV3 stake

  let setup;
  let nftPositionManager, weth;
  let accountlist;
  let user1, user2, user3;
  let defaultSender;
  let owner;
  let sqrtPrice;

  let swapAmountWTON, swapAmountTOS, remainMiningTotal;
  remainMiningTotal = ethers.BigNumber.from("0");

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

    tester1.wtonAmount = ethers.utils.parseUnits("1000", 18);
    tester1.tosAmount = ethers.utils.parseUnits("1000", 18);
    tester1.amount0Desired = ethers.utils.parseUnits("50", 18);
    tester1.amount1Desired = ethers.utils.parseUnits("50", 18);

    tester2.wtonAmount = ethers.utils.parseUnits("1000", 18);
    tester2.tosAmount = ethers.utils.parseUnits("1000", 18);
    tester2.amount0Desired = ethers.utils.parseUnits("300", 18);
    tester2.amount1Desired = ethers.utils.parseUnits("300", 18);

    sqrtPrice = encodePriceSqrt(1, 1);
  });

  describe("# 1. Deploy UniswapV3", async function () {
    it("deployedUniswapV3Contracts", async function () {
      this.timeout(1000000);

      deployedUniswapV3 = await deployedUniswapV3Contracts(defaultSender);
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

  describe("# 2. TONStarter Deployed ", async function () {
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

      await ton.mint(defaultSender, ethers.utils.parseUnits("1000", 18), {
        from: defaultSender,
      });
      await wton.mint(defaultSender, ethers.utils.parseUnits("1000", 18), {
        from: defaultSender,
      });

      await wton.mint(tester1.account.address, tester1.wtonAmount, {
        from: defaultSender,
      });
      await wton.mint(tester2.account.address, tester2.wtonAmount, {
        from: defaultSender,
      });
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

      await tos.mint(tester1.account.address, tester1.tosAmount, {
        from: defaultSender,
      });
      await tos.mint(tester2.account.address, tester2.tosAmount, {
        from: defaultSender,
      });
    });
  });

  describe("# 3. Regist Stake2Vault with phase=2 ", async function () {
    it("1. addStake2LogicAndVault2Factory for UniswapV3 Staking", async function () {
      this.timeout(1000000);

      stakeEntry2 = await ico20Contracts.addStake2LogicAndVault2Factory(
        defaultSender
      );
      const cons = await ico20Contracts.getICOContracts();
      stake2logic = cons.stake2logic;
      stakeUniswapV3Logic = cons.stakeUniswapV3Logic;
      stakeCoinageFactory = cons.stakeCoinageFactory;
      stakeUniswapV3Factory = cons.stakeUniswapV3Factory;
      stakeVaultFactory = cons.stakeVaultFactory;
      stake2vaultlogic = cons.stake2vaultlogic;
    });
  });

  describe("# 4. Phase 2 : Create StakeUniswapV3 ", async function () {
    it("1. Create StakeUniswapV3 Vaults & Stake Contract ", async function () {
      this.timeout(1000000);

      // let balance  = await stakeEntry2.balanceOf(wton.address, defaultSender);

      const cons = await ico20Contracts.getICOContracts();
      stakeVaultFactory = cons.stakeVaultFactory;
      stakeEntry2 = cons.stakeEntry2;
      tos = cons.tos;
      stakefactory = cons.stakefactory;

      const tx = await stakeEntry2
        .connect(owner)
        .createVault2(
          utils.parseUnits(PHASE2_ETHTOS_Staking, 18),
          utils.parseUnits(PHASE2_MINING_PERSECOND, 0),
            deployedUniswapV3.nftPositionManager.address,
            deployedUniswapV3.coreFactory.address,
            wton.address,
            tos.address,
          "UniswapV3"
        );
      const receipt = await tx.wait();
      // console.log('receipt',receipt);

      for (let i = 0; i < receipt.events.length; i++) {
        // console.log('receipt.events[i].event',i, receipt.events[i].event);
        if (
          receipt.events[i].event == "CreatedStakeContract2" &&
          receipt.events[i].args != null
        ) {
          vaultAddress = receipt.events[i].args.vault;
          stakeContractAddress = receipt.events[i].args.stakeContract;
        }
      }

      const codeAfter = await owner.provider.getCode(vaultAddress);
      expect(codeAfter).to.not.eq("0x");

      if (vaultAddress != null) {
        await tos
          .connect(owner)
          .mint(vaultAddress, utils.parseUnits(PHASE2_ETHTOS_Staking, 18));
      }
      expect(await tos.balanceOf(vaultAddress)).to.be.equal(
        utils.parseUnits(PHASE2_ETHTOS_Staking, 18)
      );

      TestStake2Vault = await ico20Contracts.getContract(
        "Stake2Vault",
        vaultAddress,
        owner.address
      );

      expect(await TestStake2Vault.miningPerSecond()).to.be.equal(
        utils.parseUnits(PHASE2_MINING_PERSECOND, 0)
      );
      expect(await TestStake2Vault.cap()).to.be.equal(
        utils.parseUnits(PHASE2_ETHTOS_Staking, 18)
      );
      expect(await TestStake2Vault.stakeType()).to.be.equal(
        ethers.BigNumber.from("2")
      );
      expect(await TestStake2Vault.stakeAddress()).to.be.equal(
        stakeContractAddress
      );
      expect(await TestStake2Vault.tos()).to.be.equal(tos.address);
    });

    it("2. setStartTimeOfVault2", async function () {
      this.timeout(1000000);
      let startTime = new Date().getTime();
      startTime = Math.floor(startTime / 1000);
      startTime = parseInt(startTime);

      const period = 60 * 60 * 2;
      const endTime = startTime + period;

      await stakeEntry2.setStartTimeOfVault2(vaultAddress, startTime);
      const miningStartTime = await TestStake2Vault.miningStartTime();
      expect(miningStartTime.toString()).to.be.equal(startTime + "");

      await stakeEntry2.setEndTimeOfVault2(vaultAddress, endTime);
      const miningEndTime = await TestStake2Vault.miningEndTime();
      expect(miningEndTime).to.be.equal(
        miningStartTime.add(ethers.BigNumber.from(period + ""))
      );

      TestStakeUniswapV3 = await ico20Contracts.getContract(
        "StakeUniswapV3",
        stakeContractAddress,
        owner.address
      );
      const saleStartTime = await TestStakeUniswapV3.saleStartTime();
      expect(saleStartTime.toString()).to.be.equal(startTime + "");
    });

    it("3. tos.addBunner to vault", async function () {
      this.timeout(1000000);

      const tx = await tos.addBurner(vaultAddress);
      await tx.wait();
      expect(await tos.isBurner(vaultAddress)).to.be.equal(true);
    });
  });

  describe("# 5. UniswapV3 Pool Setting & Token Creation", () => {
    it("1. pool is created and initialized  ", async () => {
      const expectedAddress = computePoolAddress(
        deployedUniswapV3.coreFactory.address,
        [wton.address, tos.address],
        FeeAmount.MEDIUM
      );

      let code = await sender.provider.getCode(expectedAddress);
      expect(code).to.eq("0x");

      const [token0, token1] = getAlignedPair(wton.address, tos.address);

      await deployedUniswapV3.coreFactory
        .connect(sender)
        .createPool(token0, token1, FeeAmount.MEDIUM);
      await timeout(10);

      const pool = new ethers.Contract(
        expectedAddress,
        IUniswapV3PoolABI.abi,
        sender
      );

      expect(expectedAddress).to.eq(pool.address);

      await pool.connect(sender).initialize(sqrtPrice);

      await timeout(10);
      code = await sender.provider.getCode(expectedAddress);
      expect(code).to.not.eq("0x");

      pool_wton_tos_address = expectedAddress;
    });

    it("2. createAndInitializePoolIfNecessary ", async () => {
      this.timeout(1000000);
      // await timeout(5);

      const [token0, token1] = getAlignedPair(wton.address, tos.address);
      await deployedUniswapV3.nftPositionManager
        .connect(sender)
        .createAndInitializePoolIfNecessary(
          token0,
          token1,
          FeeAmount.MEDIUM,
          sqrtPrice
        );

      // await timeout(10);
    });

    it("3. approve token : tester1 ", async () => {
      this.timeout(1000000);
      const tester = tester1;
      tester.wtonbalanceBefore = await wton.balanceOf(tester.account.address);
      tester.tosbalanceBefore = await tos.balanceOf(tester.account.address);

      // console.log('wtonBalance:',wtonBalance.toString());
      // console.log('tosBalance:',tosBalance.toString());

      expect(tester.wtonbalanceBefore).to.be.above(tester.amount0Desired);
      expect(tester.tosbalanceBefore).to.be.above(tester.amount1Desired);
      // console.log('call approve wton & tos');
      // await timeout(5);

      await wton
        .connect(tester.account)
        .approve(
          deployedUniswapV3.nftPositionManager.address,
          tester.wtonbalanceBefore
        );
      await tos
        .connect(tester.account)
        .approve(
          deployedUniswapV3.nftPositionManager.address,
          tester.tosbalanceBefore
        );
      // console.log('approve wton & tos');

      // await timeout(5);
      expect(
        await wton.allowance(
          tester.account.address,
          deployedUniswapV3.nftPositionManager.address
        )
      ).to.be.equal(tester.wtonbalanceBefore);
      expect(
        await tos.allowance(
          tester.account.address,
          deployedUniswapV3.nftPositionManager.address
        )
      ).to.be.equal(tester.tosbalanceBefore);
      // console.log('check approve & allowance of wton , tos');

      // await timeout(5);
    });

    it("4. mint : tester1 ", async () => {
      this.timeout(1000000);
      const tester = tester1;

      await timeout(5);
      const [token0, token1] = getAlignedPair(wton.address, tos.address);

      await deployedUniswapV3.nftPositionManager.connect(tester.account).mint({
        token0: token0,
        token1: token1,
        tickLower: getNegativeOneTick(TICK_SPACINGS[FeeAmount.MEDIUM]),
        tickUpper: getPositiveOneMaxTick(TICK_SPACINGS[FeeAmount.MEDIUM]),
        fee: FeeAmount.MEDIUM,
        recipient: tester.account.address,
        amount0Desired: tester.amount0Desired,
        amount1Desired: tester.amount1Desired,
        amount0Min: 0,
        amount1Min: 0,
        deadline: 100000000000000,
      });

      // await timeout(3);
      // console.log('5');

      const wtonBalanceAfter = await wton.balanceOf(tester.account.address);
      const tosBalanceAfter = await tos.balanceOf(tester.account.address);
      expect(wtonBalanceAfter).to.be.equal(
        tester.wtonbalanceBefore.sub(tester.amount0Desired)
      );
      expect(tosBalanceAfter).to.be.equal(
        tester.tosbalanceBefore.sub(tester.amount0Desired)
      );

      let len = await deployedUniswapV3.nftPositionManager.balanceOf(
        tester.account.address
      );

      expect(len).to.be.equal(ethers.BigNumber.from("1"));
      len = parseInt(len.toString());

      // console.log('6');
      for (let i = 0; i < len; i++) {
        const tokenId =
          await deployedUniswapV3.nftPositionManager.tokenOfOwnerByIndex(
            tester.account.address,
            i
          );
        tester.tokens.push(tokenId);
        const position = await deployedUniswapV3.nftPositionManager.positions(
          tokenId
        );
        tester.positions.push(position);
      }
      expect(tester.tokens.length).to.be.equal(1);
    });

    it("5. approve  : tester2 ", async () => {
      this.timeout(1000000);
      const tester = tester2;
      tester.wtonbalanceBefore = await wton.balanceOf(tester.account.address);
      tester.tosbalanceBefore = await tos.balanceOf(tester.account.address);

      expect(tester.wtonbalanceBefore).to.be.above(tester.amount0Desired);
      expect(tester.tosbalanceBefore).to.be.above(tester.amount1Desired);

      // console.log('call approve wton & tos');
      // await timeout(5);
      await wton
        .connect(tester.account)
        .approve(
          deployedUniswapV3.nftPositionManager.address,
          tester.wtonbalanceBefore
        );
      await tos
        .connect(tester.account)
        .approve(
          deployedUniswapV3.nftPositionManager.address,
          tester.tosbalanceBefore
        );
      // console.log('check approve & allowance of wton , tos');
      // await timeout(5);

      expect(
        await wton.allowance(
          tester.account.address,
          deployedUniswapV3.nftPositionManager.address
        )
      ).to.be.equal(tester.wtonbalanceBefore);
      expect(
        await tos.allowance(
          tester.account.address,
          deployedUniswapV3.nftPositionManager.address
        )
      ).to.be.equal(tester.tosbalanceBefore);
    });

    it("6. mint : tester2 ", async () => {
      this.timeout(1000000);
      const tester = tester2;
      // await timeout(1);
      const [token0, token1] = getAlignedPair(wton.address, tos.address);

      await deployedUniswapV3.nftPositionManager.connect(tester.account).mint({
        token0: token0,
        token1: token1,
        tickLower: getNegativeOneTick(TICK_SPACINGS[FeeAmount.MEDIUM]),
        tickUpper: getPositiveOneMaxTick(TICK_SPACINGS[FeeAmount.MEDIUM]),
        fee: FeeAmount.MEDIUM,
        recipient: tester.account.address,
        amount0Desired: tester.amount0Desired,
        amount1Desired: tester.amount1Desired,
        amount0Min: 0,
        amount1Min: 0,
        deadline: 100000000000000,
      });

      await timeout(1);

      const wtonBalanceAfter = await wton.balanceOf(tester.account.address);
      const tosBalanceAfter = await tos.balanceOf(tester.account.address);

      expect(wtonBalanceAfter).to.be.equal(
        tester.wtonbalanceBefore.sub(tester.amount0Desired)
      );
      expect(tosBalanceAfter).to.be.equal(
        tester.tosbalanceBefore.sub(tester.amount0Desired)
      );

      let len = await deployedUniswapV3.nftPositionManager.balanceOf(
        tester.account.address
      );

      expect(len).to.be.equal(ethers.BigNumber.from("1"));
      len = parseInt(len.toString());

      // console.log('6');
      for (let i = 0; i < len; i++) {
        const tokenId =
          await deployedUniswapV3.nftPositionManager.tokenOfOwnerByIndex(
            tester.account.address,
            i
          );
        tester.tokens.push(tokenId);
        const position = await deployedUniswapV3.nftPositionManager.positions(
          tokenId
        );
        tester.positions.push(position);
      }
      expect(tester.tokens.length).to.be.equal(1);
    });
  });

  describe("# 6. StakeUniswapV3 Of TONStarter ", () => {
    it("1. setMiningIntervalSeconds ", async () => {
      this.timeout(1000000);

      await ico20Contracts.stakeEntry2
        .connect(owner)
        .setMiningIntervalSeconds(
          stakeContractAddress,
          ethers.BigNumber.from("0")
        );

      TestStakeUniswapV3 = await ico20Contracts.getContract(
        "StakeUniswapV3",
        stakeContractAddress,
        tester1.account.address
      );

      expect(await TestStakeUniswapV3.miningIntervalSeconds()).to.be.equal(
        ethers.BigNumber.from("0")
      );
    });

    it("2. stake : fail stake without approve token", async () => {
      this.timeout(1000000);
      await expect(
        TestStakeUniswapV3.connect(tester1.account).stake(tester1.tokens[0])
      ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
    });

    it("3. stake : tester1", async () => {
      this.timeout(1000000);
      const tester = tester1;
      await deployedUniswapV3.nftPositionManager
        .connect(tester.account)
        .approve(stakeContractAddress, tester.tokens[0]);

      TestStakeUniswapV3 = await ico20Contracts.getContract(
        "StakeUniswapV3",
        stakeContractAddress,
        tester.account.address
      );

      const totalStakedAmountBefore =
        await TestStakeUniswapV3.totalStakedAmount();

      await TestStakeUniswapV3.connect(tester.account).stake(tester.tokens[0]);
      const depositToken = await TestStakeUniswapV3.depositTokens(
        tester.tokens[0]
      );
      const coinageToken = await TestStakeUniswapV3.stakedCoinageTokens(
        tester.tokens[0]
      );
      const userTotalStaked = await TestStakeUniswapV3.userTotalStaked(
        tester.account.address
      );
      // let totalStakedAmountAfter = await TestStakeUniswapV3.totalStakedAmount();
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
      expect(userTotalStaked.totalDepositAmount).to.be.equal(
        depositToken.liquidity
      );

      expect(await TestStakeUniswapV3.totalStakers()).to.be.equal(
        ethers.BigNumber.from("1")
      );
      expect(await TestStakeUniswapV3.totalTokens()).to.be.equal(
        ethers.BigNumber.from("1")
      );
      expect(await TestStakeUniswapV3.totalStakedAmount()).to.be.equal(
        totalStakedAmountBefore.add(depositToken.liquidity)
      );

      const coinageLastMintBlockTimetampAfter =
        await TestStakeUniswapV3.coinageLastMintBlockTimetamp();
      tester1.miningTimeLast = coinageLastMintBlockTimetampAfter;
      tester2.miningTimeLast = coinageLastMintBlockTimetampAfter;
    });

    it("4. stake : tester2 ", async () => {
      this.timeout(1000000);
      const tester = tester2;
      await deployedUniswapV3.nftPositionManager
        .connect(tester.account)
        .approve(stakeContractAddress, tester.tokens[0]);

      TestStakeUniswapV3 = await ico20Contracts.getContract(
        "StakeUniswapV3",
        stakeContractAddress,
        tester.account.address
      );
      const totalStakedAmountBefore =
        await TestStakeUniswapV3.totalStakedAmount();
      await TestStakeUniswapV3.connect(tester.account).stake(tester.tokens[0]);

      const depositToken = await TestStakeUniswapV3.depositTokens(
        tester.tokens[0]
      );
      const coinageToken = await TestStakeUniswapV3.stakedCoinageTokens(
        tester.tokens[0]
      );
      const userTotalStaked = await TestStakeUniswapV3.userTotalStaked(
        tester.account.address
      );

      expect(depositToken.owner).to.be.equal(tester.account.address);

      expect(depositToken.startTime).to.be.equal(coinageToken.startTime);
      expect(depositToken.liquidity).to.be.equal(coinageToken.amount);
      expect(depositToken.secondsInsideInitial).to.be.above(0);
      expect(depositToken.secondsInsideLast).to.be.equal(0);

      expect(userTotalStaked.staked).to.be.equal(true);
      expect(userTotalStaked.totalDepositAmount).to.be.equal(
        depositToken.liquidity
      );

      expect(await TestStakeUniswapV3.totalStakers()).to.be.equal(
        ethers.BigNumber.from("2")
      );
      expect(await TestStakeUniswapV3.totalTokens()).to.be.equal(
        ethers.BigNumber.from("2")
      );

      expect(await TestStakeUniswapV3.totalStakedAmount()).to.be.equal(
        totalStakedAmountBefore.add(depositToken.liquidity)
      );

      const coinageLastMintBlockTimetampAfter =
        await TestStakeUniswapV3.coinageLastMintBlockTimetamp();
      tester1.miningTimeLast = coinageLastMintBlockTimetampAfter;
      tester2.miningTimeLast = coinageLastMintBlockTimetampAfter;
    });

    it("5. miningCoinage :  ", async () => {
      this.timeout(1000000);
      const coinageLastMintBlockTimetampBefore =
        await TestStakeUniswapV3.coinageLastMintBlockTimetamp();
      const canBalanceBefore = await TestStakeUniswapV3.balanceOfCoinage(
        tester1.tokens[0]
      );

      await TestStakeUniswapV3.connect(tester1.account).miningCoinage();

      const canBalanceAfter = await TestStakeUniswapV3.balanceOfCoinage(
        tester1.tokens[0]
      );
      const coinageLastMintBlockTimetampAfter =
        await TestStakeUniswapV3.coinageLastMintBlockTimetamp();
      expect(canBalanceAfter).to.be.above(
        canBalanceBefore
      );
      expect(coinageLastMintBlockTimetampBefore).to.be.lt(
        coinageLastMintBlockTimetampAfter
      );

      tester1.miningTimeLast = coinageLastMintBlockTimetampAfter;
      tester2.miningTimeLast = coinageLastMintBlockTimetampAfter;
    });

    it("6. claim : tester1 ", async () => {
      this.timeout(1000000);
      const tester = tester1;
      const vaultBalanceTOS = await tos.balanceOf(vaultAddress);
      const totalSupplyTOS = await tos.totalSupply();

      let miningAmount = ethers.BigNumber.from("0");
      let nonminingAmount = ethers.BigNumber.from("0");

      const tosBalanceBefore = await tos.balanceOf(tester.account.address);
      const miningInfosBefore = await TestStakeUniswapV3.getMiningTokenId(
        tester.tokens[0]
      );

      expect(miningInfosBefore.miningAmount).to.be.equal(
        ethers.BigNumber.from(miningInfosBefore.minableAmount.toString())
          .mul(
            ethers.BigNumber.from(
              miningInfosBefore.secondsInsideDiff256.toString()
            )
          )
          .div(
            ethers.BigNumber.from(
              miningInfosBefore.secondsAbsolute256.toString()
            )
          )
      );
      expect(miningInfosBefore.nonMiningAmount).to.be.equal(
        ethers.BigNumber.from(miningInfosBefore.minableAmount.toString()).sub(
          ethers.BigNumber.from(miningInfosBefore.miningAmount.toString())
        )
      );
      expect(miningInfosBefore.minableAmount).to.be.above(
        ethers.BigNumber.from("0")
      );

      const coinageTokenBefore = await TestStakeUniswapV3.stakedCoinageTokens(
        tester.tokens[0]
      );

      let depositToken = await TestStakeUniswapV3.depositTokens(
        tester.tokens[0]
      );
      expect(miningInfosBefore.minableAmount).to.be.above(
        ethers.BigNumber.from("0")
      );

      const tx = await TestStakeUniswapV3.connect(tester.account).claim(
        tester.tokens[0]
      );
      const receipt = await tx.wait();

      for (let i = 0; i < receipt.events.length; i++) {
        // console.log('receipt.events[i].event',i, receipt.events[i].event);
        if (
          receipt.events[i].event == "Claimed" &&
          receipt.events[i].args != null
        ) {
          const miningAmount1 = receipt.events[i].args.miningAmount;
          const nonMiningAmount1 = receipt.events[i].args.nonMiningAmount;

          miningAmount = miningAmount.add(miningAmount1);
          nonminingAmount = nonminingAmount.add(nonMiningAmount1);
        }
      }
      const minableAmount = miningAmount.add(nonminingAmount);

      const tosBalanceAfter = await tos.balanceOf(tester.account.address);
      const miningInfosAfter = await TestStakeUniswapV3.getMiningTokenId(
        tester.tokens[0]
      );
      expect(miningInfosAfter.miningAmount).to.be.equal(
        ethers.BigNumber.from("0")
      );
      expect(miningInfosAfter.nonMiningAmount).to.be.equal(
        ethers.BigNumber.from("0")
      );
      expect(miningInfosAfter.minableAmount).to.be.equal(
        ethers.BigNumber.from("0")
      );

      expect(tosBalanceBefore.add(miningAmount)).to.be.equal(tosBalanceAfter);

      depositToken = await TestStakeUniswapV3.depositTokens(tester.tokens[0]);
      const coinageToken = await TestStakeUniswapV3.stakedCoinageTokens(
        tester.tokens[0]
      );
      const userTotalStaked = await TestStakeUniswapV3.userTotalStaked(
        tester.account.address
      );

      expect(
        coinageToken.claimedAmount.sub(coinageTokenBefore.claimedAmount)
      ).to.be.equal(miningAmount);
      expect(
        coinageToken.nonMiningAmount.sub(coinageTokenBefore.nonMiningAmount)
      ).to.be.equal(nonminingAmount);

      expect(depositToken.claimedTime).to.be.equal(coinageToken.claimedTime);
      expect(userTotalStaked.totalMiningAmount).to.be.equal(
        coinageToken.claimedAmount
      );
      expect(userTotalStaked.totalNonMiningAmount).to.be.equal(
        coinageToken.nonMiningAmount
      );

      // const secondDiff =
      //   depositToken.secondsInsideLast - depositToken.secondsInsideInitial;
      // const miningAmountForSecondDiff = secondDiff * PHASE2_MINING_PERSECOND;

      // expect(minableAmount).to.be.lte(
      //   ethers.BigNumber.from(miningAmountForSecondDiff + "")
      // );
      remainMiningTotal = remainMiningTotal.sub(minableAmount);

      const vaultBalanceTOSAfter = await tos.balanceOf(vaultAddress);
      const totalSupplyTOSAfter = await tos.totalSupply();
      expect(vaultBalanceTOS).to.be.equal(
        vaultBalanceTOSAfter.add(minableAmount)
      );
      expect(totalSupplyTOS).to.be.equal(
        totalSupplyTOSAfter.add(nonminingAmount)
      );

      const coinageLastMintBlockTimetampAfter =
        await TestStakeUniswapV3.coinageLastMintBlockTimetamp();
      tester1.miningTimeLast = coinageLastMintBlockTimetampAfter;
      tester2.miningTimeLast = coinageLastMintBlockTimetampAfter;
    });

    it("7. claim : tester2 ", async () => {
      this.timeout(1000000);
      const tester = tester2;
      const vaultBalanceTOS = await tos.balanceOf(vaultAddress);
      const totalSupplyTOS = await tos.totalSupply();
      let miningAmount = ethers.BigNumber.from("0");
      let nonminingAmount = ethers.BigNumber.from("0");

      const tosBalanceBefore = await tos.balanceOf(tester.account.address);
      const miningInfosBefore = await TestStakeUniswapV3.getMiningTokenId(
        tester.tokens[0]
      );

      expect(miningInfosBefore.miningAmount).to.be.equal(
        ethers.BigNumber.from(miningInfosBefore.minableAmount.toString())
          .mul(
            ethers.BigNumber.from(
              miningInfosBefore.secondsInsideDiff256.toString()
            )
          )
          .div(
            ethers.BigNumber.from(
              miningInfosBefore.secondsAbsolute256.toString()
            )
          )
      );
      expect(miningInfosBefore.nonMiningAmount).to.be.equal(
        ethers.BigNumber.from(miningInfosBefore.minableAmount.toString()).sub(
          ethers.BigNumber.from(miningInfosBefore.miningAmount.toString())
        )
      );
      expect(miningInfosBefore.minableAmount).to.be.above(
        ethers.BigNumber.from("0")
      );

      const coinageTokenBefore = await TestStakeUniswapV3.stakedCoinageTokens(
        tester.tokens[0]
      );

      let depositToken = await TestStakeUniswapV3.depositTokens(
        tester.tokens[0]
      );

      // expect(miningInfosBefore.miningAmount).to.be.above(ethers.BigNumber.from('0'));
      // expect(miningInfosBefore.nonMiningAmount).to.be.above(ethers.BigNumber.from('0'));
      expect(miningInfosBefore.minableAmount).to.be.above(
        ethers.BigNumber.from("0")
      );

      const tx = await TestStakeUniswapV3.connect(tester.account).claim(
        tester.tokens[0]
      );
      const receipt = await tx.wait();

      for (let i = 0; i < receipt.events.length; i++) {
        // console.log('receipt.events[i].event',i, receipt.events[i].event);
        if (
          receipt.events[i].event == "Claimed" &&
          receipt.events[i].args != null
        ) {
          const miningAmount1 = receipt.events[i].args.miningAmount;
          const nonMiningAmount1 = receipt.events[i].args.nonMiningAmount;

          miningAmount = miningAmount.add(miningAmount1);
          nonminingAmount = nonminingAmount.add(nonMiningAmount1);
        }
      }
      const minableAmount = miningAmount.add(nonminingAmount);

      const tosBalanceAfter = await tos.balanceOf(tester.account.address);
      const miningInfosAfter = await TestStakeUniswapV3.getMiningTokenId(
        tester.tokens[0]
      );
      expect(miningInfosAfter.miningAmount).to.be.equal(
        ethers.BigNumber.from("0")
      );
      expect(miningInfosAfter.nonMiningAmount).to.be.equal(
        ethers.BigNumber.from("0")
      );
      expect(miningInfosAfter.minableAmount).to.be.equal(
        ethers.BigNumber.from("0")
      );

      expect(tosBalanceBefore.add(miningAmount)).to.be.equal(tosBalanceAfter);

      depositToken = await TestStakeUniswapV3.depositTokens(tester.tokens[0]);
      const coinageToken = await TestStakeUniswapV3.stakedCoinageTokens(
        tester.tokens[0]
      );
      const userTotalStaked = await TestStakeUniswapV3.userTotalStaked(
        tester.account.address
      );

      expect(
        coinageToken.claimedAmount.sub(coinageTokenBefore.claimedAmount)
      ).to.be.equal(miningAmount);
      expect(
        coinageToken.nonMiningAmount.sub(coinageTokenBefore.nonMiningAmount)
      ).to.be.equal(nonminingAmount);

      expect(depositToken.claimedTime).to.be.equal(coinageToken.claimedTime);
      expect(userTotalStaked.totalMiningAmount).to.be.equal(
        coinageToken.claimedAmount
      );
      expect(userTotalStaked.totalNonMiningAmount).to.be.equal(
        coinageToken.nonMiningAmount
      );

      // const secondDiff =
      //   depositToken.secondsInsideLast - depositToken.secondsInsideInitial;
      // const miningAmountForSecondDiff = secondDiff * PHASE2_MINING_PERSECOND;

      // expect(minableAmount).to.be.lte(
      //   ethers.BigNumber.from(miningAmountForSecondDiff + "")
      // );
      remainMiningTotal = remainMiningTotal.sub(minableAmount);

      const vaultBalanceTOSAfter = await tos.balanceOf(vaultAddress);
      const totalSupplyTOSAfter = await tos.totalSupply();
      expect(vaultBalanceTOS).to.be.equal(
        vaultBalanceTOSAfter.add(minableAmount)
      );
      expect(totalSupplyTOS).to.be.equal(
        totalSupplyTOSAfter.add(nonminingAmount)
      );

      const coinageLastMintBlockTimetampAfter =
        await TestStakeUniswapV3.coinageLastMintBlockTimetamp();
      tester1.miningTimeLast = coinageLastMintBlockTimetampAfter;
      tester2.miningTimeLast = coinageLastMintBlockTimetampAfter;
    });

    it("8. miningCoinage :  ", async () => {
      this.timeout(1000000);
      await timeout(5);
      const coinageLastMintBlockTimetampBefore =
        await TestStakeUniswapV3.coinageLastMintBlockTimetamp();
      const canBalanceBefore = await TestStakeUniswapV3.balanceOfCoinage(
        tester1.tokens[0]
      );

      await TestStakeUniswapV3.connect(tester1.account).miningCoinage();

      const canBalanceAfter = await TestStakeUniswapV3.balanceOfCoinage(
        tester1.tokens[0]
      );
      const coinageLastMintBlockTimetampAfter =
        await TestStakeUniswapV3.coinageLastMintBlockTimetamp();

      expect(canBalanceAfter).to.be.above(
        canBalanceBefore
      );
      expect(coinageLastMintBlockTimetampBefore).to.be.lt(
        coinageLastMintBlockTimetampAfter
      );

      tester1.miningTimeLast = coinageLastMintBlockTimetampAfter;
      tester2.miningTimeLast = coinageLastMintBlockTimetampAfter;
    });

    it("9. withdraw : tester1 ", async () => {
      this.timeout(1000000);

      const tester = tester1;
      const totalStakedAmountBefore =
        await TestStakeUniswapV3.totalStakedAmount();
      const totalTokensBefore = await TestStakeUniswapV3.totalTokens();
      const miningAmountTotalBefore =
        await TestStakeUniswapV3.miningAmountTotal();
      const nonMiningAmountTotalBefore =
        await TestStakeUniswapV3.nonMiningAmountTotal();

      const depositTokenBefore = await TestStakeUniswapV3.depositTokens(
        tester.tokens[0]
      );

      const miningInfosBefore = await TestStakeUniswapV3.getMiningTokenId(
        tester.tokens[0]
      );

      expect(miningInfosBefore.miningAmount).to.be.above(
        ethers.BigNumber.from("0")
      );

      await TestStakeUniswapV3.connect(tester.account).withdraw(
        tester.tokens[0]
      );

      const depositToken = await TestStakeUniswapV3.depositTokens(
        tester.tokens[0]
      );
      const coinageToken = await TestStakeUniswapV3.stakedCoinageTokens(
        tester.tokens[0]
      );
      const userTotalStaked = await TestStakeUniswapV3.userTotalStaked(
        tester.account.address
      );

      expect(depositToken.owner).to.be.equal(zeroAddress);
      expect(depositToken.liquidity).to.be.equal(ethers.BigNumber.from("0"));
      expect(depositToken.startTime).to.be.equal(ethers.BigNumber.from("0"));
      expect(coinageToken.amount).to.be.equal(ethers.BigNumber.from("0"));
      expect(coinageToken.startTime).to.be.equal(ethers.BigNumber.from("0"));
      expect(coinageToken.claimedAmount).to.be.equal(
        ethers.BigNumber.from("0")
      );

      expect(userTotalStaked.staked).to.be.equal(false);

      expect(userTotalStaked.totalDepositAmount).to.be.equal(
        ethers.BigNumber.from("0")
      );

      const totalStakedAmountAfter =
        await TestStakeUniswapV3.totalStakedAmount();
      const totalTokensAfter = await TestStakeUniswapV3.totalTokens();
      const miningAmountTotalAfter =
        await TestStakeUniswapV3.miningAmountTotal();
      const nonMiningAmountTotalAfter =
        await TestStakeUniswapV3.nonMiningAmountTotal();

      expect(totalStakedAmountAfter).to.be.equal(
        totalStakedAmountBefore.sub(depositTokenBefore.liquidity)
      );

      expect(totalTokensAfter).to.be.equal(
        totalTokensBefore.sub(ethers.BigNumber.from("1"))
      );

      const miningInfosAfter = await TestStakeUniswapV3.getMiningTokenId(
        tester.tokens[0]
      );

      expect(miningInfosAfter.miningAmount).to.be.equal(
        ethers.BigNumber.from("0")
      );
      expect(miningInfosAfter.nonMiningAmount).to.be.equal(
        ethers.BigNumber.from("0")
      );
      expect(miningInfosAfter.minableAmount).to.be.equal(
        ethers.BigNumber.from("0")
      );
      expect(miningInfosAfter.secondsInside).to.be.equal(
        ethers.BigNumber.from("0")
      );
      expect(miningInfosAfter.minableAmountRay).to.be.equal(
        ethers.BigNumber.from("0")
      );
    });
    it("10. withdraw : tester2 ", async () => {
      this.timeout(1000000);

      const tester = tester2;
      const totalStakedAmountBefore =
        await TestStakeUniswapV3.totalStakedAmount();
      const totalTokensBefore = await TestStakeUniswapV3.totalTokens();
      const miningAmountTotalBefore =
        await TestStakeUniswapV3.miningAmountTotal();
      const nonMiningAmountTotalBefore =
        await TestStakeUniswapV3.nonMiningAmountTotal();

      const depositTokenBefore = await TestStakeUniswapV3.depositTokens(
        tester.tokens[0]
      );

      const miningInfosBefore = await TestStakeUniswapV3.getMiningTokenId(
        tester.tokens[0]
      );

      expect(miningInfosBefore.miningAmount).to.be.above(
        ethers.BigNumber.from("0")
      );

      await TestStakeUniswapV3.connect(tester.account).withdraw(
        tester.tokens[0]
      );

      const depositToken = await TestStakeUniswapV3.depositTokens(
        tester.tokens[0]
      );
      const coinageToken = await TestStakeUniswapV3.stakedCoinageTokens(
        tester.tokens[0]
      );
      const userTotalStaked = await TestStakeUniswapV3.userTotalStaked(
        tester.account.address
      );

      expect(depositToken.owner).to.be.equal(zeroAddress);
      expect(depositToken.liquidity).to.be.equal(ethers.BigNumber.from("0"));
      expect(depositToken.startTime).to.be.equal(ethers.BigNumber.from("0"));
      expect(coinageToken.amount).to.be.equal(ethers.BigNumber.from("0"));
      expect(coinageToken.startTime).to.be.equal(ethers.BigNumber.from("0"));
      expect(coinageToken.claimedAmount).to.be.equal(
        ethers.BigNumber.from("0")
      );

      expect(userTotalStaked.staked).to.be.equal(false);

      expect(userTotalStaked.totalDepositAmount).to.be.equal(
        ethers.BigNumber.from("0")
      );

      const totalStakedAmountAfter =
        await TestStakeUniswapV3.totalStakedAmount();
      const totalTokensAfter = await TestStakeUniswapV3.totalTokens();
      const miningAmountTotalAfter =
        await TestStakeUniswapV3.miningAmountTotal();
      const nonMiningAmountTotalAfter =
        await TestStakeUniswapV3.nonMiningAmountTotal();

      expect(totalStakedAmountAfter).to.be.equal(
        totalStakedAmountBefore.sub(depositTokenBefore.liquidity)
      );

      expect(totalTokensAfter).to.be.equal(
        totalTokensBefore.sub(ethers.BigNumber.from("1"))
      );

      const miningInfosAfter = await TestStakeUniswapV3.getMiningTokenId(
        tester.tokens[0]
      );

      expect(miningInfosAfter.miningAmount).to.be.equal(
        ethers.BigNumber.from("0")
      );
      expect(miningInfosAfter.nonMiningAmount).to.be.equal(
        ethers.BigNumber.from("0")
      );
      expect(miningInfosAfter.minableAmount).to.be.equal(
        ethers.BigNumber.from("0")
      );
      expect(miningInfosAfter.secondsInside).to.be.equal(
        ethers.BigNumber.from("0")
      );
      expect(miningInfosAfter.minableAmountRay).to.be.equal(
        ethers.BigNumber.from("0")
      );
    });
  });
});
