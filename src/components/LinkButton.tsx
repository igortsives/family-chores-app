"use client";

import * as React from "react";
import NextLink from "next/link";
import Button, { ButtonProps } from "@mui/material/Button";

type Props = ButtonProps & { href: string };

export default function LinkButton({ href, children, ...props }: Props) {
  return (
    <Button {...props} component={NextLink} href={href}>
      {children}
    </Button>
  );
}
