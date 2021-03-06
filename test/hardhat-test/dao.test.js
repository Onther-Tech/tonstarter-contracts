const { expect } = require("chai");
const { time, expectEvent } = require('@openzeppelin/test-helpers');

describe("DAO", function () {
  let deployer, user1, user2, user3;
  let STOS;
  let DAOEntry;
  let DAORecipient;

  // Init
  before(async function () {
    [deployer, user1, user2, user3, user4] = await ethers.getSigners();

    const STOSContract = await ethers.getContractFactory("STOS");
    STOS = await STOSContract.connect(deployer).deploy();
    await STOS.deployed();



    const DAOContract = await ethers.getContractFactory("DAO");
    const DAO = await DAOContract.connect(deployer).deploy();
    await DAO.deployed();
    await STOS.connect(deployer).mint(DAO.address, "10000000");

    const DAOProxyContract = await ethers.getContractFactory("DAOProxy");
    const DAOProxy = await DAOProxyContract.connect(deployer).deploy(STOS.address);
    await DAOProxy.deployed();
    DAOProxy.upgradeTo(DAO.address);

    DAOEntry = await DAOContract.attach(DAOProxy.address);

    const DAORecipientContract = await ethers.getContractFactory("DAORecipientExample");
    DAORecipient = await DAORecipientContract.connect(deployer).deploy(DAOProxy.address);
    await DAORecipient.deployed();
  });

  it("should create new agenda", async function () {
    await DAOEntry.connect(user1).newAgenda(
      DAORecipient.address,
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("generateNextFib()")),
    );
  });

  it("should check current fib", async function () {
    expect(await DAORecipient.getFib()).to.be.equal(5);
  });

  it("should vote yes from user1", async function () {
    await DAOEntry.connect(user1).vote("1", true);
    await DAOEntry.connect(user2).vote("1", false);
    await DAOEntry.connect(user3).vote("1", true);
  });

  it("should execute function", async function () {
    await time.increase(time.duration.weeks(2));
    await DAOEntry.connect(user4).executeAgenda(
      "1",
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("generateNextFib()")),
    );
  });

  it("should check current fib", async function () {
    expect(await DAORecipient.getFib()).to.be.equal(8);
  });
});
