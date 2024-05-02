export const HowToPlayComponent: React.FC = ({}) => {
  return (
    <div className="flex-1 flex flex-col h-full p-mono">
      <div className="w-full marquee bg-secondary text-center">
        Sign up and get your avatar in{" "}
        <a
          href="https://biome1.biomes.aw"
          rel="noreferrer"
          target="_blank"
          style={{ textDecoration: "underline", fontWeight: "bolder", color: "white" }}
        >
          Biome-1
        </a>{" "}
        before playing this experience!
      </div>
      <div className="p-12 flex flex-col justify-between gap-4">
        <h2 className="text-xl pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
          Your Instructions Here
        </h2>
      </div>
    </div>
  );
};
