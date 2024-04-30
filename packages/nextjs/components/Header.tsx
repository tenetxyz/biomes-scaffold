"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { Bars3Icon, CodeBracketIcon, Cog6ToothIcon, PlayCircleIcon } from "@heroicons/react/24/outline";
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
    label: "Smart Contract",
    href: "/debug",
    icon: <CodeBracketIcon className="h-4 w-4" />,
  },
  {
    label: "Manage Permissions",
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
        const isActive = pathname === href;
        if (href === "/manage" && connectedAddress === undefined) return null;

        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "bg-secondary shadow-md" : ""
              } hover:bg-secondary hover:shadow-md focus:!bg-secondary active:!text-neutral py-1.5 px-3 text-sm rounded-sm gap-2 grid grid-flow-col`}
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

  const MarqueeContent = () => {
    const links = new Array(500).fill(0);

    return (
      <div className="marquee bg-secondary">
        <div className="marquee--inner flex gap-16">
          {links.map((_, index) => (
            <span key={index}>
              <a href="http://biomes.aw">Biomes.aw</a>
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className="sticky lg:static top-0 min-h-0 flex-shrink-0 z-20 p-mono"
      style={{ background: "#160b21", borderBottom: "1px solid #0e0715" }}
    >
      <MarqueeContent />
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
                className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52"
                onClick={() => {
                  setIsDrawerOpen(false);
                }}
              >
                <HeaderMenuLinks />
              </ul>
            )}
          </div>
          <Link href="/" passHref className="hidden lg:flex items-center gap-2 ml-4 mr-6 shrink-0">
            <div className="flex relative w-10 h-10" style={{ border: "2px solid white" }}>
              <Image alt="SE2 logo" className="cursor-pointer" fill src="/biomesAW_logo.png" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold leading-tight">Biome 1</span>
              <span className="text-xs">Extension</span>
            </div>
          </Link>
          <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
            <HeaderMenuLinks />
          </ul>
        </div>
        <div className="navbar-end flex-grow mr-4">
          <RainbowKitCustomConnectButton />
          <FaucetButton />
        </div>
      </div>
    </div>
  );
};
