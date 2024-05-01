import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { ContractInput } from "./ContractInput";
import { getFunctionInputKey, getInitalTupleFormState } from "./utilsContract";
import { replacer } from "~~/utils/scaffold-eth/common";
import { AbiParameterTuple } from "~~/utils/scaffold-eth/contract";

type TupleProps = {
  abiTupleParameter: AbiParameterTuple;
  setParentForm: Dispatch<SetStateAction<Record<string, any>>>;
  parentStateObjectKey: string;
  parentForm: Record<string, any> | undefined;
};

export const Tuple = ({ abiTupleParameter, parentForm, setParentForm, parentStateObjectKey }: TupleProps) => {
  const [form, setForm] = useState<Record<string, any>>(() => getInitalTupleFormState(abiTupleParameter));

  useEffect(() => {
    const values = Object.values(form);
    const argsStruct: Record<string, any> = {};
    abiTupleParameter.components.forEach((component, componentIndex) => {
      argsStruct[component.name || `input_${componentIndex}_`] = values[componentIndex];
    });

    setParentForm(parentForm => ({ ...parentForm, [parentStateObjectKey]: JSON.stringify(argsStruct, replacer) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(form, replacer)]);

  useEffect(() => {
    if (parentForm) {
      const currentParentValue = parentForm[parentStateObjectKey];
      if (currentParentValue === undefined || currentParentValue === null || currentParentValue === "") {
        return;
      }
      // Check if form field matches parent, if not update it to match

      const argsStruct: Record<string, any> = {};
      const values = Object.values(form);
      abiTupleParameter.components.forEach((component, componentIndex) => {
        argsStruct[component.name || `input_${componentIndex}_`] = values[componentIndex];
      });
      const parentFormData = JSON.parse(currentParentValue);
      const currentFormValue = JSON.stringify(argsStruct, replacer);
      if (currentParentValue !== currentFormValue) {
        const newForm: Record<string, any> = {};
        abiTupleParameter.components.forEach((component, componentIndex) => {
          const key = getFunctionInputKey(abiTupleParameter.name || "tuple", component, componentIndex);
          if (component.name) {
            newForm[key] = parentFormData[component.name];
          }
        });
        setForm(newForm);
      }
    }
  }, [JSON.stringify(parentForm, replacer)]);

  return (
    <div>
      <div className="collapse rounded-sm collapse-arrow pl-4 py-1.5 border border-white">
        <input type="checkbox" className="min-h-fit peer" />
        <div className="collapse-title p-0 min-h-fit peer-checked:mb-2 text-primary-content/80">
          <p className="m-0 p-0 text-[1rem]">{abiTupleParameter.internalType}</p>
        </div>
        <div className="ml-3 flex-col space-y-4 border-white/80 pl-2 collapse-content">
          {abiTupleParameter?.components?.map((param, index) => {
            const key = getFunctionInputKey(abiTupleParameter.name || "tuple", param, index);
            return <ContractInput setForm={setForm} form={form} key={key} stateObjectKey={key} paramType={param} />;
          })}
        </div>
      </div>
    </div>
  );
};
