import { expect } from "chai";
import { ethers } from "hardhat";
import { Experience } from "../typechain-types";

describe("Experience", function () {
  // We define a fixture to reuse the same setup in every test.

  let experienceContract: Experience;
  before(async () => {
    const [owner] = await ethers.getSigners();
    const experienceContractFactory = await ethers.getContractFactory("Experience");
    experienceContract = (await experienceContractFactory.deploy(owner.address)) as Experience;
    await experienceContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should have a Biomes world address", async function () {
      const address = await experienceContract.getBiomeWorldAddress();
      expect(address).to.be.a("string");
      expect(address).to.have.length(42);
    });
  });
});
