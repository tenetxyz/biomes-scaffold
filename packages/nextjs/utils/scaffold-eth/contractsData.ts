import { ChainWithAttributes } from "./networks";
import { contracts } from "~~/utils/scaffold-eth/contract";

export function getAllContracts(targetNetwork: ChainWithAttributes) {
  const contractsData = contracts?.[targetNetwork.id];
  return contractsData ? contractsData : {};
}
