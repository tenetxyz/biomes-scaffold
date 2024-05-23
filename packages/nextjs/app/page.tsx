"use client";

import React, { useCallback, useEffect } from "react";
import { BuildWithPos } from "./debug/_components/contract";
import type { NextPage } from "next";
import { encodeFunctionData, parseEther } from "viem";
import { useAccount } from "wagmi";
import { Experience } from "~~/components/Experience";
import { Landing } from "~~/components/Landing";
import { RegisterBiomes } from "~~/components/RegisterBiomes";
import { RegisterExperience } from "~~/components/RegisterExperience";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { Stage, useGlobalState } from "~~/services/store/store";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const stage = useGlobalState(({ stage }) => stage);
  const setStage = useGlobalState(({ setStage }) => setStage);

  const isBiomesRegistered = useGlobalState(({ isBiomesRegistered }) => isBiomesRegistered);
  const isExperienceRegistered = useGlobalState(({ isExperienceRegistered }) => isExperienceRegistered);
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo("BedrockDAO");

  useEffect(() => {
    //     const token = await ethers.getContractAt(‘ERC20’, tokenAddress);
    console.log("deployedContractData", deployedContractData);

    // const transferCalldata = token.interface.encodeFunctionData(‘transfer’, [teamAddress, grantAmount]);
    if (deployedContractData !== undefined) {
      // addBuildJob(string memory description, uint256 budget, BuildWithPos memory build)
      const description = "Test Proposal";
      const budget = parseEther("1");
      const build: BuildWithPos = {
        objectTypeIds: [35, 35],
        relativePositions: [
          { x: 0, y: 0, z: 0 },
          { x: 0, y: 0, z: 1 },
        ],
        baseWorldCoord: { x: 30, y: -5, z: 20 },
      };

      const data = encodeFunctionData({
        abi: deployedContractData.abi,
        functionName: "addBuildJob",
        args: [description, budget, build],
      });
      console.log("data", data);
    }
  }, [deployedContractData]);

  useEffect(() => {
    if (connectedAddress) {
      if (isBiomesRegistered) {
        if (isExperienceRegistered) {
          setStage(Stage.EXPERIENCE);
        } else {
          setStage(Stage.REGISTER_EXPERIENCE);
        }
      } else {
        setStage(Stage.REGISTER_BIOMES);
      }
    } else {
      setStage(Stage.CONNECT_WALLET);
    }
  }, [connectedAddress, isBiomesRegistered, isExperienceRegistered]);

  const renderStage = useCallback(() => {
    switch (stage) {
      case Stage.CONNECT_WALLET:
        return <Landing />;
      case Stage.REGISTER_BIOMES:
        return <RegisterBiomes />;
      case Stage.REGISTER_EXPERIENCE:
        return <RegisterExperience />;
      case Stage.EXPERIENCE:
        return <Experience />;
    }
  }, [stage, connectedAddress]);

  return <>{renderStage()}</>;
};

export default Home;
