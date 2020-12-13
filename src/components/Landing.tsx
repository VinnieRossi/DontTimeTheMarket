import React, { useState } from "react";
import LineGraph from "./LineGraph";

import twothousandeight from "../assets/2008.json";
import twentytwelve from "../assets/2012.json";
import twentynineteen from "../assets/2019.json";
import { Button, Typography } from "@material-ui/core";

const Landing = (): JSX.Element => {
  const years = [twothousandeight, twentytwelve, twentynineteen];
  const [selectedYear, setSelectedYear] = useState(twentytwelve);
  return (
    <>
      <Typography variant="h4">Don't time the market!</Typography>
      <Button
        variant="contained"
        color="default"
        onClick={() => {
          setSelectedYear(years[Math.floor(Math.random() * years.length)]);
        }}
      >
        Swap year
      </Button>
      <LineGraph data={selectedYear} />
    </>
  );
};

export default Landing;
