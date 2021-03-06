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

  const [deployer, user1] = await ethers.getSigners();
  const users = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address, process.env.NETWORK);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const tos = await ethers.getContractAt("TOS", tostoken);
  console.log("tos:", tos.address);

  //================================================

  // let tx = await tos.addAdmin(process.env.PHASE2_LP_VAULT_ADDRESS);

  // console.log("tos addAdmin", process.env.PHASE2_LP_VAULT_ADDRESS);
  // await tx.wait();

  // let res = await tos.isAdmin(deployer.address);
  // console.log("tos isAdmin", deployer.address,  res );


  let res = await tos.grantRole(ADMIN_ROLE, process.env.PHASE2_LP_VAULT_ADDRESS);
  console.log("tos isAdmin", process.env.PHASE2_LP_VAULT_ADDRESS,  res );
  await res.wait();

  let res1 = await tos.hasRole(ADMIN_ROLE, process.env.PHASE2_LP_VAULT_ADDRESS);
  console.log("tos admin ", res1 );

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
