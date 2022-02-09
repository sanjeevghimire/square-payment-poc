import { useEffect, useState } from "react";
import { useExternalScript } from "./hooks/useExternalScript";
import { url, locationId, appId } from "./config/credentials";

export const Form = () => {
  const [card, setCard] = useState({});
  const [amount, setAmount] = useState(1);

  const status = useExternalScript(url);

  const initializeCard = async (payments) => {
    const card = await payments.card();
    await card.attach("#card-container");
    return card;
  };

  const tokenize = async (paymentMethod) => {
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
  };

  const createPayment = async (token) => {
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
  };

  // status is either SUCCESS or FAILURE;
  const displayPaymentResults = (status) => {
    const statusContainer = document.getElementById("payment-status-container");
    if (status === "SUCCESS") {
      statusContainer.classList.remove("is-failure");
      statusContainer.classList.add("is-success");
    } else {
      statusContainer.classList.remove("is-success");
      statusContainer.classList.add("is-failure");
    }

    statusContainer.style.visibility = "visible";
  };

  const displayError = () => {
    const statusContainer = document.getElementById("payment-status-container");
    statusContainer.className = "missing-credentials";
    statusContainer.style.visibility = "visible";
  };

  const handlePaymentMethodSubmission = async (card) => {
    const cardButton = document.getElementById("card-button");
    try {
      // disable the submit button as we await tokenization and make a payment request.
      cardButton.disabled = true;
      const token = await tokenize(card);
      const paymentResults = await createPayment(token);
      displayPaymentResults("SUCCESS");

      console.debug("Payment Success", paymentResults);
    } catch (e) {
      cardButton.disabled = false;
      displayPaymentResults("FAILURE");
      console.error(e.message);
    }
  };

  const load = async () => {
    if (!window.Square) {
      throw new Error("Square.js failed to load properly");
    }

    let payments;
    try {
      payments = window.Square.payments(appId, locationId);
    } catch {
      displayError();
      return;
    }

    try {
      const cards = await initializeCard(payments);
      setCard(cards);
    } catch (e) {
      console.error("Initializing Card failed", e);
      displayError();
      return;
    }
  };

  const handleClick = async () => await handlePaymentMethodSubmission(card);

  useEffect(() => {
    load();
  }, [status]);

  return (
    <div id="payment-form">
      {status === "loading" && <p>loading...</p>}
      {status === "ready" && (
        <>
          <div id="card-container"></div>
          <button id="card-button" onClick={handleClick}>
            Pay ${amount}.00
          </button>
          <div id="payment-status-container"></div>
        </>
      )}
    </div>
  );
};
