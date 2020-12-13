import {
  Grid,
  Card,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@material-ui/core";
import React from "react";
import NumberFormat from "react-number-format";

interface TransactionHistoryProps {
  startingBalance: number;
  transactions: any[];
}

const TransactionHistory = ({
  startingBalance,
  transactions,
}: TransactionHistoryProps) => {
  const generateTransactionLineItem = (transaction: any): any => {
    const dateString = transaction.date
      .toLocaleDateString()
      .split("/")
      .splice(0, 2)
      .join("/");
    const string = `${dateString}: ${transaction.shareQuantity} shares ${transaction.transactionType} at `;

    return (
      <>
        <Typography style={{ display: "inline" }}>{string}</Typography>
        <NumberFormat
          value={transaction.pricePerShare}
          decimalScale={2}
          fixedDecimalScale
          displayType={"text"}
          thousandSeparator={true}
          prefix={"$"}
        />
        <Typography style={{ display: "inline" }}>. New balance: </Typography>
        <NumberFormat
          value={transaction.currentPortfolioBalance}
          style={{
            color:
              transaction.currentPortfolioBalance >= startingBalance
                ? "green"
                : "red",
          }}
          decimalScale={2}
          fixedDecimalScale
          displayType={"text"}
          thousandSeparator={true}
          prefix={"$"}
        />
      </>
    );
  };

  return (
    <Grid container justify="flex-end">
      <Card
        style={{
          minWidth: 540,
          minHeight: 215,
          maxHeight: 300,
          overflow: "auto",
          padding: 15,
        }}
      >
        <CardHeader title="Transaction History" />
        <List>
          {transactions.map((transaction, index) => (
            <ListItem key={index} style={{ paddingBottom: 0, paddingTop: 0 }}>
              <ListItemText>
                {generateTransactionLineItem(transaction)}
              </ListItemText>
            </ListItem>
          ))}
        </List>
      </Card>
    </Grid>
  );
};

export default TransactionHistory;
