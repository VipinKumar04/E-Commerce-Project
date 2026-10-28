const membershipButtons = document.querySelectorAll(".membership-buy-button");
const membershipMessage = document.getElementById("membershipMessage");

membershipButtons.forEach((button)=>{
    button.addEventListener("click",()=>{
        button.disabled = true;
        membershipMessage.textContent = "Starting payment...";

        fetch("/membership/create-order",{
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                planCode: button.dataset.planCode
            })
        })
            .then((response)=>response.json().then((data)=>{
                if(!response.ok){
                    throw new Error(data.message || "Could not start payment.");
                }
                return data;
            }))
            .then((data)=>{
                const checkout = new Razorpay({
                    key: data.key,
                    amount: data.amount,
                    currency: data.currency,
                    name: "E-commerce Membership",
                    order_id: data.orderId,
                    handler: (paymentResponse)=>{
                        fetch("/membership/confirm-payment",{
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                purchaseId: data.purchaseId,
                                paymentId: paymentResponse.razorpay_payment_id,
                                orderId: paymentResponse.razorpay_order_id
                            })
                        })
                            .then((response)=>response.json().then((result)=>{
                                if(!response.ok){
                                    throw new Error(result.message || "Could not confirm payment.");
                                }
                                return result;
                            }))
                            .then((result)=>{
                                membershipMessage.textContent = result.message;
                                if(result.success){
                                    window.location.href = "/membership?success=1";
                                }
                            })
                            .catch((error)=>{
                                membershipMessage.textContent = error.message;
                                button.disabled = false;
                            });
                    }
                });

                checkout.on("payment.failed",()=>{
                    membershipMessage.textContent = "Payment failed. You can try again.";
                    button.disabled = false;
                });

                checkout.open();
            })
            .catch((error)=>{
                membershipMessage.textContent = error.message;
                button.disabled = false;
            });
    });
});
