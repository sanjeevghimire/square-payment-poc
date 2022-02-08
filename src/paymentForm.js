import React, { useEffect, useState } from "react";

import { useExternalScript } from "./hooks/useExternalScript";
import { appId, locationId } from "./config/Credentials";
import { url } from "./config/Sandbox";

export const LoadScript = () => {
  const [token, setToken] = useState("");

  //returns ready or loading
  // const status = "ready";
  const status = useExternalScript(url);

  async function initializeCard(payments) {
    console.log("payments ", payments);
    const card = await payments.card();
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
    console.log("payment >>>", paymentMethod);
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

  // status is either SUCCESS or FAILURE;
  function displayPaymentResults(status) {
    const statusContainer = document.getElementById("payment-status-container");
    if (status === "SUCCESS") {
      statusContainer.classList.remove("is-failure");
      statusContainer.classList.add("is-success");
    } else {
      statusContainer.classList.remove("is-success");
      statusContainer.classList.add("is-failure");
    }

    statusContainer.style.visibility = "visible";
  }

  async function load() {
    if (!window.Square) {
      throw new Error("Square.js failed to load properly");
    }

    let payments;
    try {
      payments = window.Square.payments(appId, locationId);
    } catch {
      const statusContainer = document.getElementById(
        "payment-status-container"
      );
      statusContainer.className = "missing-credentials";
      statusContainer.style.visibility = "visible";
      return;
    }

    let card;
    try {
      card = await initializeCard(payments);
    } catch (e) {
      console.error("Initializing Card failed", e);
      return;
    }

    // Checkpoint 2.
    async function handlePaymentMethodSubmission(event, paymentMethod) {
      event.preventDefault();

      try {
        // disable the submit button as we await tokenization and make a payment request.
        cardButton.disabled = true;
        const token = await tokenize(paymentMethod);
        console.log("TOken >>>>>>>>>", token);
        setToken(token);
        const paymentResults = await createPayment(token);
        displayPaymentResults("SUCCESS");

        console.debug("Payment Success", paymentResults);
      } catch (e) {
        cardButton.disabled = false;
        displayPaymentResults("FAILURE");
        console.error(e.message);
      }
    }

    const cardButton = document.getElementById("card-button");
    cardButton.addEventListener("click", async function (event) {
      await handlePaymentMethodSubmission(event, card);
    });
  }

  useEffect(() => {
    load();
  }, [status]);

  return (
    <div>
      {status === "loading" && <p>loading...</p>}
      {status === "ready" && (
        <>
          <div>TOKEN = "{token}"</div>
          <form id="payment-form">
            <div id="card-container"></div>
            <button id="card-button" type="button">
              Pay $1.000
            </button>
          </form>
          <div id="payment-status-container"></div>
        </>
      )}
    </div>
  );
};
