import { create } from "zustand";
import scaffoldConfig from "~~/scaffold.config";
import { ChainWithAttributes } from "~~/utils/scaffold-eth";

export enum Stage {
  CONNECT_WALLET,
  REGISTER_BIOMES,
  REGISTER_EXPERIENCE,
  SETUP_BIOMES_CLIENT,
  EXPERIENCE,
}

/**
 * Zustand Store
 *
 * You can add global state to the app using this useGlobalState, to get & set
 * values from anywhere in the app.
 *
 * Think about it as a global useState.
 */

type GlobalState = {
  nativeCurrencyPrice: number;
  setNativeCurrencyPrice: (newNativeCurrencyPriceState: number) => void;
  targetNetwork: ChainWithAttributes;
  setTargetNetwork: (newTargetNetwork: ChainWithAttributes) => void;
  isBiomesRegistered: boolean;
  setIsBiomesRegistered: (newIsBiomesRegistered: boolean) => void;
  isExperienceRegistered: boolean;
  setIsExperienceRegistered: (newIsExperienceRegistered: boolean) => void;
  isBiomesClientSetup: boolean;
  setIsBiomesClientSetup: (newIsBiomesClientSetup: boolean) => void;
  stage: Stage;
  setStage: (newStage: Stage) => void;
  addressToBiomesName: Record<string, string>;
  setAddressToBiomesName: (newAddressToBiomesName: Record<string, string>) => void;
};

export const useGlobalState = create<GlobalState>(set => ({
  nativeCurrencyPrice: 0,
  setNativeCurrencyPrice: (newValue: number): void => set(() => ({ nativeCurrencyPrice: newValue })),
  targetNetwork: scaffoldConfig.targetNetworks[0],
  setTargetNetwork: (newTargetNetwork: ChainWithAttributes) => set(() => ({ targetNetwork: newTargetNetwork })),
  isBiomesRegistered: false,
  setIsBiomesRegistered: (newIsBiomesRegistered: boolean) => set(() => ({ isBiomesRegistered: newIsBiomesRegistered })),
  isExperienceRegistered: false,
  setIsExperienceRegistered: (newIsExperienceRegistered: boolean) =>
    set(() => ({ isExperienceRegistered: newIsExperienceRegistered })),
  isBiomesClientSetup: false,
  setIsBiomesClientSetup: (newIsBiomesClientSetup: boolean) =>
    set(() => ({ isBiomesClientSetup: newIsBiomesClientSetup })),
  stage: Stage.CONNECT_WALLET,
  setStage: (newStage: Stage) => set(() => ({ stage: newStage })),
  addressToBiomesName: {},
  setAddressToBiomesName: (newAddressToBiomesName: Record<string, string>) =>
    set(() => ({ addressToBiomesName: newAddressToBiomesName })),
}));
