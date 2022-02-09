import React, { useEffect, useState } from "react";

import { url } from "../config/Sandbox";
import { useExternalScript } from "../hooks/useExternalScript";
import { appId, locationId } from "../config/Credentials";

const Form = () => {
  const [error, setError] = useState(false);

  const [amount, setAmount] = useState(1);

  const [token, setToken] = useState("");
  const [cards, setCards] = useState({});

  const status = useExternalScript(url);

  async function initializeCard(payments) {
    const card = await payments.card();
    //most weird part ... lol
    await card.attach("#card-container");

    return card;
  }

  async function createPayment(token) {
    const body = JSON.stringify({
      locationId,
      sourceId: token,
    });

    const paymentResponse = await fetch("/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    if (paymentResponse.ok) {
      return paymentResponse.json();
    }

    const errorBody = await paymentResponse.text();
    throw new Error(errorBody);
  }

  async function tokenize(paymentMethod) {
    const tokenResult = await paymentMethod.tokenize();
    if (tokenResult.status === "OK") {
      return tokenResult.token;
    } else {
      let errorMessage = `Tokenization failed with status: ${tokenResult.status}`;
      if (tokenResult.errors) {
        errorMessage += ` and errors: ${JSON.stringify(tokenResult.errors)}`;
      }

      throw new Error(errorMessage);
    }
  }

  async function handlePaymentMethodSubmission(event, paymentMethod) {
    event.preventDefault();

    try {
      const token = await tokenize(paymentMethod);
      console.log("Token ", token);
      setToken(token);

      const paymentResults = await createPayment(token);

      console.log("success");
      // displayPaymentResults("SUCCESS");

      // console.debug("Payment Success", paymentResults);
    } catch (e) {
      // displayPaymentResults("FAILURE");
      console.error(e.message);
    }
  }

  async function load() {
    if (!window.Square) {
      throw new Error("Square.js failed to load properly");
    }

    let payments;
    try {
      payments = window.Square.payments(appId, locationId);
    } catch (e) {
      setError("missing-credentials");
      return;
    }
    try {
      const card = await initializeCard(payments);
      setCards(card);
    } catch (e) {
      setError("Initializing Card failed");
      console.error("Initializing Card failed", e);
      return;
    }
  }

  const handlePay = async (e) => {
    setToken("loading....");
    await handlePaymentMethodSubmission(e, cards);
  };

  useEffect(() => {
    load();
    console.log("Status", status);
  }, [status]);

  return (
    <main>
      {status === "loading" && <p>loading...</p>}
      {status === "error" && <p>Connection problem...</p>}
      {status === "ready" && (
        <div>
          <div id="card-container"></div>

          <div>
            <button onClick={handlePay}>Pay ${amount}</button>
          </div>

          <p>
            Token :{" "}
            <span>
              <h3>{token}</h3>
            </span>
          </p>
          {error && <div>Error in payment</div>}
        </div>
      )}
    </main>
  );
};

export default Form;
