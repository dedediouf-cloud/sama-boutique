"use client";

import React, { isValidElement, ReactNode, ReactElement, cloneElement, Fragment } from "react";
import { useTranslation } from "@/lib/i18n";

export function Trans({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  const translate = (node: ReactNode): ReactNode => {
    if (typeof node === "string") {
      return t(node);
    }
    if (typeof node === "number") {
      return node;
    }
    if (Array.isArray(node)) {
      // On entoure chaque enfant d'un Fragment avec une clé pour éviter le warning React
      return node.map((child, index) => (
        <Fragment key={index}>{translate(child)}</Fragment>
      ));
    }
    if (isValidElement(node)) {
      const element = node as ReactElement<{ children?: ReactNode }>;
      const child = element.props.children;
      // Ne pas traduire les props "fonction" (render props)
      if (child !== undefined && typeof child !== "function") {
        return cloneElement(element, { ...element.props, children: translate(child) });
      }
      return node;
    }
    return node;
  };

  return <>{translate(children)}</>;
}
