import { createTheme } from "@mui/material/styles";
export const theme = createTheme({
  palette: { mode: "light" },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: [
      "system-ui","-apple-system","Segoe UI","Roboto","Helvetica","Arial","sans-serif",
    ].join(","),
  },
});
