const { BigNumber } = require("ethers");
const { ethers, upgrades } = require("hardhat");
const utils = ethers.utils;
const save = require("../save_deployed");
const { printGasUsedOfUnits } = require("../log_tx");

const {
  toBN,
  keccak256,
} = require("web3-utils");

require("dotenv").config();

const loadDeployed = require("../load_deployed");

const zeroAddress = "0x0000000000000000000000000000000000000000";
const tostoken = loadDeployed(process.env.NETWORK, "TOS");


async function deployMain(defaultSender) {
  const [deployer, user1] = await ethers.getSigners();

  const TOS_Address = tostoken;
  const tos = await ethers.getContractAt("TOS", TOS_Address);
  console.log("tos:", tos.address);

  const LockTOS = await ethers.getContractFactory("LockTOS");

  let deployInfo = {name:'', address:''};
  const lockTOS = await LockTOS.deploy();
  let tx = await lockTOS.deployed();
  console.log("LockTOS:", lockTOS.address);
  deployInfo = {
    name: "LockTOS",
    address: lockTOS.address
  }
  if(deployInfo.address != null && deployInfo.address.length > 0  ){
    save(process.env.NETWORK, deployInfo);
  }

  printGasUsedOfUnits('LockTOS  Deploy',tx);


  return null;
}

async function main() {
  const [deployer, user1] = await ethers.getSigners();
  const users = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address, process.env.NETWORK);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  contracts = await deployMain(deployer);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
