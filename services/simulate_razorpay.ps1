$payload = @"
{
  "entity": "event",
  "account_id": "acc_BFQ7uQEeXv6z8N",
  "event": "payment.failed",
  "contains": [
    "payment"
  ],
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_OThY4sJ8GzQvLp",
        "entity": "payment",
        "amount": 500000,
        "currency": "INR",
        "status": "failed",
        "order_id": "order_OThX8wE9DzQxLm",
        "invoice_id": null,
        "international": false,
        "method": "upi",
        "amount_refunded": 0,
        "refund_status": null,
        "captured": false,
        "description": "Subscription Renewal",
        "card_id": null,
        "bank": null,
        "wallet": null,
        "vpa": "customer@icici",
        "email": "customer@example.com",
        "contact": "+919876543210",
        "notes": [],
        "fee": null,
        "tax": null,
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Payment failed due to insufficient funds.",
        "error_source": "customer",
        "error_step": "payment_authentication",
        "error_reason": "insufficient_funds",
        "created_at": 1724220000
      }
    }
  },
  "created_at": 1724220000
}
"@

Write-Host "Sending Razorpay webhook to Go API Gateway..." -ForegroundColor Cyan

$response = Invoke-RestMethod -Uri "http://localhost:8080/webhooks/razorpay" -Method Post -Body $payload -ContentType "application/json" -Headers @{"X-Razorpay-Signature"="mock_signature_for_testing"}

Write-Host "Webhook sent. Gateway returned:" -ForegroundColor Green
$response | ConvertTo-Json
