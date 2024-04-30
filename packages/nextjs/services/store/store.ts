import { create } from "zustand";
import scaffoldConfig from "~~/scaffold.config";
import { ChainWithAttributes } from "~~/utils/scaffold-eth";

export enum Stage {
  CONNECT_WALLET,
  REGISTER_BIOMES,
  REGISTER_PLAYER,
  SETUP_BIOMES_CLIENT,
  GAME,
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
  isGameRegistered: boolean;
  setIsGameRegistered: (newIsGameRegistered: boolean) => void;
  isBiomesClientSetup: boolean;
  setIsBiomesClientSetup: (newIsBiomesClientSetup: boolean) => void;
  stage: Stage;
  setStage: (newStage: Stage) => void;
};

export const useGlobalState = create<GlobalState>(set => ({
  nativeCurrencyPrice: 0,
  setNativeCurrencyPrice: (newValue: number): void => set(() => ({ nativeCurrencyPrice: newValue })),
  targetNetwork: scaffoldConfig.targetNetworks[0],
  setTargetNetwork: (newTargetNetwork: ChainWithAttributes) => set(() => ({ targetNetwork: newTargetNetwork })),
  isBiomesRegistered: false,
  setIsBiomesRegistered: (newIsBiomesRegistered: boolean) => set(() => ({ isBiomesRegistered: newIsBiomesRegistered })),
  isGameRegistered: false,
  setIsGameRegistered: (newIsGameRegistered: boolean) => set(() => ({ isGameRegistered: newIsGameRegistered })),
  isBiomesClientSetup: false,
  setIsBiomesClientSetup: (newIsBiomesClientSetup: boolean) =>
    set(() => ({ isBiomesClientSetup: newIsBiomesClientSetup })),
  stage: Stage.CONNECT_WALLET,
  setStage: (newStage: Stage) => set(() => ({ stage: newStage })),
}));
