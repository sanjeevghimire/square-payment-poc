import React from "react";
import "./App.css";

import { LoadScript } from "./paymentForm";

function App() {
  return (
    <div>
      <div>Square Developer Offering</div>
      <p>Payments API</p>
      <LoadScript />
    </div>
  );
}

export default App;
