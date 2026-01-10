import { createTheme } from "@mui/material/styles";

export const muiTheme = createTheme({
  typography: {
    fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
  },
  components: {
    MuiButton: {
      defaultProps: {
        size: "small",
        variant: "outlined",
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
      },
    },
  },
});
