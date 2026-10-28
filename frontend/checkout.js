const checkoutButton = document.getElementById("checkoutButton");
const checkoutMessage = document.getElementById("checkoutMessage");

if(checkoutButton){
    checkoutButton.addEventListener("click",()=>{
        checkoutButton.disabled = true;

        fetch("/cart/pay/" + checkoutButton.dataset.orderId,{
            method: "POST"
        }).then((response)=>{
                return response.json().then((data)=>{
                    if(!response.ok){
                        console.log(data.message || "Could not start payment.");
                    }
                    return data;
                });
            })
            .then((data)=>{
                const options = {
                    key: data.key,
                    amount: data.amount,
                    currency: data.currency,
                    name: "E-commerce",
                    order_id: data.orderId,
                    handler: (paymentResponse)=>{
                        fetch("/cart/confirm-payment",{
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                paymentId: paymentResponse.razorpay_payment_id,
                                orderId: paymentResponse.razorpay_order_id
                            })
                        })
                            .then((response)=>{
                                return response.json().then((data)=>{
                                    if(!response.ok){
                                        console.log(data.message || "Could not confirm payment.");
                                    }
                                    return data;
                                });
                            })
                            .then((data)=>{
                                checkoutMessage.textContent = data.message;
                                checkoutButton.disabled = false;
                            })
                            .catch((error)=>{
                                checkoutMessage.textContent = error.message;
                                checkoutButton.disabled = false;
                            });
                    },
                };

                const checkout = new Razorpay(options);

                checkout.on("payment.failed",()=>{
                    checkoutMessage.textContent = "Payment failed. You can try again.";
                    checkoutButton.disabled = false;
                });

                checkout.open();
            })
            .catch((error)=>{
                checkoutMessage.textContent = error.message;
                checkoutButton.disabled = false;
            });
    });
}
