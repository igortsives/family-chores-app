"use client";

import * as React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const theme = createTheme({
  shape: { borderRadius: 12 },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    h4: { fontWeight: 800, letterSpacing: -0.3 },
    h5: { fontWeight: 800, letterSpacing: -0.2 },
    h6: { fontWeight: 750, letterSpacing: -0.1 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiCard: { styleOverrides: { root: { borderRadius: 16 } } },
    MuiButton: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiAppBar: { styleOverrides: { root: { backdropFilter: "blur(10px)" } } },
  },
});

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
