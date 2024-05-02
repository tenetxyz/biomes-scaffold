"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { Bars3Icon, Cog6ToothIcon, InformationCircleIcon, PlayCircleIcon } from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Play",
    href: "/",
    icon: <PlayCircleIcon className="h-4 w-4" />,
  },
  {
    label: "How To Play",
    href: "/how-to-play",
    icon: <InformationCircleIcon className="h-4 w-4" />,
  },
  // {
  //   label: "Smart Contract",
  //   href: "/debug",
  //   icon: <CodeBracketIcon className="h-4 w-4" />,
  // },
  {
    label: "Manage Hooks",
    href: "/manage",
    icon: <Cog6ToothIcon className="h-4 w-4" />,
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();
  const { address: connectedAddress } = useAccount();

  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href || pathname === href + "/";
        if (href === "/manage" && connectedAddress === undefined) return null;

        return (
          <li key={href}>
            <Link
              href={href}
              style={{ borderRadius: "0px" }}
              className={`${
                isActive ? "bg-biomes hover:bg-biomes" : "bg-white/10"
              } flex items-center gap-2 px-2 py-1.5 font-mono uppercase text-sm leading-none transition border border-white/20 hover:border-white `}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const burgerMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(
    burgerMenuRef,
    useCallback(() => setIsDrawerOpen(false), []),
  );

  return (
    <div
      className="sticky lg:static top-0 min-h-0 flex-shrink-0 z-20 p-mono"
      style={{ background: "#160b21", borderBottom: "1px solid #0e0715" }}
    >
      <div className="navbar justify-between px-0 sm:px-2 mt-1">
        <div className="navbar-start w-auto lg:w-1/2">
          <div className="lg:hidden dropdown" ref={burgerMenuRef}>
            <label
              tabIndex={0}
              className={`ml-1 btn btn-ghost ${isDrawerOpen ? "hover:bg-secondary" : "hover:bg-transparent"}`}
              onClick={() => {
                setIsDrawerOpen(prevIsOpenState => !prevIsOpenState);
              }}
            >
              <Bars3Icon className="h-1/2" />
            </label>
            {isDrawerOpen && (
              <ul
                tabIndex={0}
                className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-sm w-52"
                onClick={() => {
                  setIsDrawerOpen(false);
                }}
              >
                <HeaderMenuLinks />
              </ul>
            )}
          </div>
          <Link
            href="https://biome1.biomes.aw/"
            rel="noreferrer"
            target="_blank"
            className="ml-4 flex items-center gap-2 font-mono uppercase text-sm leading-none transition hover:bg-white hover:text-black pr-2"
          >
            <div className="flex relative w-10 h-10" style={{ border: "2px solid white" }}>
              <Image alt="SE2 logo" className="cursor-pointer" fill src="/biomesAW_logo.png" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold leading-tight">Biome-1</span>
              <span className="text-xs">Experience</span>
            </div>
          </Link>
          <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-6 gap-2">
            <HeaderMenuLinks />
          </ul>
        </div>
        <div className="navbar-end flex-grow mr-4 gap-4">
          <a
            href="https://discord.gg/J75hkmtmM4"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/10 border border-white/20 px-2 py-1.5 font-mono uppercase text-sm leading-none transition hover:border-white"
          >
            <img style={{ width: "24px" }} src="/discord.png" />
            Join Discord
          </a>
          <RainbowKitCustomConnectButton />
          <FaucetButton />
        </div>
      </div>
    </div>
  );
};
