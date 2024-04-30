import { expect } from "chai";
import { ethers } from "hardhat";
import { Game } from "../typechain-types";

describe("Game", function () {
  // We define a fixture to reuse the same setup in every test.

  let gameContract: Game;
  before(async () => {
    const [owner] = await ethers.getSigners();
    const gameContractFactory = await ethers.getContractFactory("Game");
    gameContract = (await gameContractFactory.deploy(owner.address)) as Game;
    await gameContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should have a Biomes world address", async function () {
      const address = await gameContract.biomeWorldAddress();
      expect(address).to.be.a("string");
      expect(address).to.have.length(42);
    });
  });
});
