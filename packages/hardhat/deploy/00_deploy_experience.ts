import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { garnet, mudFoundry, redstone } from "@latticexyz/common/chains";
import { Contract } from "ethers";

const BIOMES_MAINNET_WORLD_ADDRESS = "0xf75b1b7bdb6932e487c4aa8d210f4a682abeacf0";
const BIOMES_TESTNET_WORLD_ADDRESS = "0x641554ed9d8a6c2c362e6c3fb2835ec2ca4da95c";

/**
 * Deploys a contract named "Experience" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployExperienceContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const chainId = await hre.getChainId();

  let useBiomesWorldAddress =
    Number(chainId) === redstone.id
      ? BIOMES_MAINNET_WORLD_ADDRESS
      : Number(chainId) === garnet.id
      ? BIOMES_TESTNET_WORLD_ADDRESS
      : "";

  if (Number(chainId) === mudFoundry.id) {
    // read local worlds.json file
    const worlds = require("../../../../biomes-contracts/packages/world/worlds.json");
    useBiomesWorldAddress = worlds[chainId].address;
  }

  if (useBiomesWorldAddress === "") {
    throw new Error("Biomes World Address not found for this chain");
  }
  console.log("useBiomesWorldAddress", useBiomesWorldAddress);

  await deploy("BuyChest", {
    from: deployer,
    // Contract constructor arguments
    args: [useBiomesWorldAddress],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  await deploy("SellChest", {
    from: deployer,
    // Contract constructor arguments
    args: [useBiomesWorldAddress],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  await deploy("BuySellChest", {
    from: deployer,
    // Contract constructor arguments
    args: [useBiomesWorldAddress],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  await deploy("BondingCurveChest", {
    from: deployer,
    // Contract constructor arguments
    args: [useBiomesWorldAddress],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  await deploy("TokenizedChest", {
    from: deployer,
    // Contract constructor arguments
    args: [useBiomesWorldAddress],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  // Get the deployed contract to interact with it after deploying.
  const bondingCurveChestContract = await hre.ethers.getContract<Contract>("BondingCurveChest", deployer);

  await deploy("ShopToken", {
    from: deployer,
    // Contract constructor arguments
    args: ["BGrass", "BGRS", bondingCurveChestContract.target],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  const bcShopTokenContract = await hre.ethers.getContract<Contract>("ShopToken", deployer);

  // Get the deployed contract to interact with it after deploying.
  const tokenizedChestContract = await hre.ethers.getContract<Contract>("TokenizedChest", deployer);

  await deploy("ShopToken", {
    from: deployer,
    // Contract constructor arguments
    args: ["Grass", "GRS", tokenizedChestContract.target],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  const shopTokenContract = await hre.ethers.getContract<Contract>("ShopToken", deployer);

  // Update objectToToken mapping with the token address
  const objectTypeId = 35; // Grass
  await bondingCurveChestContract.updateObjectToToken(objectTypeId, bcShopTokenContract.target);
  await tokenizedChestContract.updateObjectToToken(objectTypeId, shopTokenContract.target);
};

export default deployExperienceContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags Experience
deployExperienceContract.tags = ["Experience"];
