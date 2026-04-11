"use client";

import { SearchableDropdown } from "@/components/ui/searchable-dropdown";
import { useMemo } from "react";

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Puducherry",
] as const;

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputBackground?: string;
  className?: string;
};

export function StateSearchSelect({
  id: idProp,
  value,
  onChange,
  placeholder = "Select",
  inputBackground = "#1E1E24",
  className = "",
}: Props) {
  const options = useMemo(
    () => INDIAN_STATES.map((s) => ({ value: s, label: s })),
    []
  );

  return (
    <SearchableDropdown
      id={idProp}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder="Search state…"
      inputBackground={inputBackground}
      className={className}
    />
  );
}
