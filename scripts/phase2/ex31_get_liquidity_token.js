const { BigNumber } = require("ethers");
const { ethers, upgrades } = require("hardhat");
const utils = ethers.utils;
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
//const loadDeployedInput = require("./load_deployed_input");

const { printGasUsedOfUnits } = require("../log_tx");

const {
  // padLeft,
  // toBN,
  // toWei,
  // fromWei,
  keccak256,
  // soliditySha3,
  // solidityKeccak256,
} = require("web3-utils");
const Web3EthAbi = require('web3-eth-abi');

require("dotenv").config();

const zeroAddress = "0x0000000000000000000000000000000000000000";
const ADMIN_ROLE = keccak256("ADMIN");

const tostoken = loadDeployed(process.env.NETWORK, "TOS");

const proxy = loadDeployed(process.env.NETWORK, "Stake1Proxy");
const ton = loadDeployed(process.env.NETWORK, "TON");

async function main() {

  const [deployer, user1, user2] = await ethers.getSigners();
  const users = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address, process.env.NETWORK);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const tos = await ethers.getContractAt("TOS", tostoken);
  console.log("tos:", tos.address);

  //================================================

  const StakeUniswapV3 = await ethers.getContractAt("StakeUniswapV3", process.env.PHASE2_STAKE_UNISWAPV3_ADDRESS);

  const tokenId3875 = ethers.BigNumber.from("3875");

  let token = {
    id: tokenId3875,
    name: '3875',
    sender : user2
  }

   let res0 =  await StakeUniswapV3.depositTokens(token.id);
    console.log("\n StakeUniswapV3 depositTokens:",  token.id.toString(),
    '\n owner:',res0.owner,
    '\n idIndex:',res0.idIndex.toString()
    );


   let res1 =  await StakeUniswapV3.getDepositToken(token.id);
    console.log("\n StakeUniswapV3 getDepositToken:",  token.id.toString(),
    '\n poolAddress:',res1.poolAddress,
    '\n _depositTokens.tick:',res1.tick[0] , res1.tick[1] ,
    '\n _depositTokens.liquidity:',res1.liquidity.toString(),
    '\n _depositTokens.startTime:',res1.args[0].toString(),
    '\n _depositTokens.claimedTime:',res1.args[1].toString(),
    '\n _stakedCoinageTokens.startTime:',res1.args[2].toString(),
    '\n _stakedCoinageTokens.claimedTime:',res1.args[3].toString(),
    '\n _stakedCoinageTokens.claimedAmount:',res1.args[4].toString(),
     '\n _depositTokens.secondsInsideInitial:',res1.secondsPL[0].toString(),
     '\n _depositTokens.secondsInsideLast:',res1.secondsPL[1].toString()
    );



  let res =  await StakeUniswapV3.getMiningTokenId(token.id);
  if(res!=null){
    console.log("\n StakeUniswapV3 getMiningTokenId:",
    token.id.toString(),
      '\n miningAmount:',utils.formatUnits(res.miningAmount.toString(), 18) ,
      '\n nonMiningAmount:',utils.formatUnits(res.nonMiningAmount.toString(), 18),
      '\n minableAmount:',utils.formatUnits(res.minableAmount.toString(), 18),
      '\n secondsInside:',res.secondsInside.toString(),
      '\n secondsInsideDiff:',res.secondsInsideDiff.toString(),
      '\n liquidity:',res.liquidity.toString(),
      '\n balanceOfTokenIdRay:', utils.formatUnits(res.balanceOfTokenIdRay.toString(), 27),
      '\n minableAmountRay:', utils.formatUnits(res.minableAmountRay.toString(), 27),
      '\n secondsAbsolute160:',res.secondsAbsolute160.toString(),
      '\n secondsInsideDiff256:',res.secondsInsideDiff256.toString(),
      '\n secondsAbsolute256:',res.secondsAbsolute256.toString()
      );
  }

   //=====================================
  let res2 =  await StakeUniswapV3.totalSupplyCoinage();
  console.log("\n StakeUniswapV3 totalSupplyCoinage:", utils.formatUnits(res2.toString(), 27)  );

  let res3 =  await StakeUniswapV3.balanceOfCoinage(token.id);
  console.log("\n StakeUniswapV3 balanceOfCoinage:", utils.formatUnits(res3.toString(), 27)  );

  const Stake2Vault = await ethers.getContractAt("Stake2Vault", process.env.PHASE2_LP_VAULT_ADDRESS);
  let miningPerSecond =  await Stake2Vault.miningPerSecond();
  console.log("\n Stake2Vault miningPerSecond:", utils.formatUnits(miningPerSecond.toString(), 18)  );

  // let miningPerSecond =  await Stake2Vault.miningPerSecond();
  // console.log("\n Stake2Vault miningPerSecond:", utils.formatUnits(miningPerSecond.toString(), 18)  );

  let coinageLastMintBlockTimetamp =  await StakeUniswapV3.coinageLastMintBlockTimetamp();
  console.log("\n StakeUniswapV3 coinageLastMintBlockTimetamp:", coinageLastMintBlockTimetamp.toString()  );


  let stakeStartTime =  await StakeUniswapV3.stakeStartTime();
  console.log("\n -------- StakeUniswapV3 stakeStartTime:", stakeStartTime.toString());

  let saleStartTime =  await StakeUniswapV3.saleStartTime();
  console.log("\n -------- StakeUniswapV3 saleStartTime:", saleStartTime.toString());


 }

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
