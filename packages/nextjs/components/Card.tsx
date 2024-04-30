import React from "react";

interface CardSectionProps {
  description: string;
  relevantSystems?: string[];
  children: React.ReactNode;
}

export const CardSection: React.FC<CardSectionProps> = ({ description, relevantSystems, children }) => {
  return (
    <div className="px-4 pt-2 pb-4 mt-4" style={{ backgroundColor: "#160b21", border: "1px solid #0e0715" }}>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 text-left">
          <p className="text-xs text-gray-300">DESCRIPTION</p>
          <p className="font-regular text-md">{description}</p>
        </div>
        {relevantSystems && (
          <div className="col-span-2 text-left">
            <p className="text-xs text-gray-300">ACTIONS</p>
            <ul>
              {relevantSystems.map((system, index) => (
                <li
                  key={index}
                  className="text-md px-2"
                  style={{ backgroundColor: "#0e0715", marginBottom: "4px", borderRadius: "2px" }}
                >
                  {system}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className={"flex flex-col items-end justify-center " + (relevantSystems ? "col-span-2" : "col-span-4")}>
          {React.Children.map(children, (child, index) => (
            <div key={index} className="my-1">
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
