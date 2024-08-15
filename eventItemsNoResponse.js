const order = {
    header: {
        business: "The Streets App, LLC",
        application: "Streets App",
        businessCity: "@thestreetsapp",
        businessWebsite: "https://thestreetsapp.com",
        orderId: "-O3pZE9tDhUtAUO4BA6Q",
        eventId: "-NwsPsT_KyiUlYLPSQGB",
        orderDate: "2024-08-09T05:16:17.000Z",
        customerEmail: "dreaminkode@gmail.com",
        seller: "CETA EVENTS!!",
        end:"2024-08-09T05:16:17.000Z",
        usageBox:{
            title: "Usage tips Yurplan",
            details: "Must be presented at the event check"
        },
        appIcon:{
            url: "https://www.flaticon.com/free-icon/mobile-application_17489455?term=app&page=1&position=1&origin=search&related_id=17489455",
            description:"This piece of paper will not give you tasty love \nThe Yurplan app does",
            androidAppUrl: "",
            iosAppUrl:"",
        }
    },
    event: {
        active: true,
        chat: false,
        details: `This is your general karaoke event`,
        id: "-NwsPsT_KyiUlYLPSQGB",
        images: [
            "https://s3.us-east-1.wasabisys.com/streets-product-prod/-Nv7OCieGiC2p7jvGGFO/0.jpg"
        ],
        location: {
            address: {
                city: "Washington",
                lineOne: "1100 New York Ave NW",
                postalCode: "20005",
                state: "DC"
            },
            coordinates: {
                latitude: 38.8999734,
                longitude: -77.0272452
            },
            name: "Hot Topic"
        },
        name: "KKaraoke Wednesday ",
        private: false,
        refundPolicy: false,
        reminders: {
            DXEIqEjaIBZb9ejABYYYvyPKZZT2: {
                timestamp: 1720727575
            },
            IHVTDW4pFiX8r40u4Qj4qAQ9lbu1: {
                timestamp: 1720228027
            },
            MMFod8us1jeHqY36DiZP02Q1ovW2: {
                timestamp: 1720725771
            }
        },
        saved: {
            MMFod8us1jeHqY36DiZP02Q1ovW2: {
                timestamp: 1716353298
            }
        },
        secure: {
            enabled: true
        },
        start: 1723485600,
        tickets: [
            {
                details: "This is a free ticket ",
                id: "5c8ecb2f-aac9-467e-b1a0-d16d5f0f3a84",
                name: "Free Ticket III",
                options: [
                    {
                        title: "How Did You Hear About This Party?",
                        response:"Testingggggggggg"
                    }
                ],
                party: 5,
                quantity: 96,
                saleStart: 1718756100,
                stripePriceId: "price_1PBv0RKmq4PcFwKLxSwJnJ9i",
                stripeProductId: "prod_Q1yysDiW6ACSAO"
            },
            {
                details: "Guaranteed entry into the event",
                id: "b198071c-0fb6-40bd-881f-a3803bb2213d",
                linkedTicketId: "5c8ecb2f-aac9-467e-b1a0-d16d5f0f3a84",
                name: "General Admission III",
                options: [
                    {
                        title: "Where are you sitting?"
                    }
                ],
                price: 3000,
                quantity: 148,
                saleStart: 1718756100,
                stripePriceId: "price_1PBv0RKmq4PcFwKL5lb8iVaT",
                stripeProductId: "prod_Q1yyXeuSO1GXtX"
            },
            {
                details: "This is a vip ticket. The price has definitely gone up!!",
                id: "c53396a6-cb25-427e-8c3d-501c51753503",
                linkedTicketId: "5c8ecb2f-aac9-467e-b1a0-d16d5f0f3a84",
                name: "VIP Ticket",
                price: 4500,
                quantity: 35,
                saleStart: 1718756100,
                stripePriceId: "price_1PBv0SKmq4PcFwKLnbID0AFb",
                stripeProductId: "prod_Q1yyH91jSPINyV"
            }
        ],
        userId: "MMFod8us1jeHqY36DiZP02Q1ovW2"
    },
    items: [
        {
            id: "c53396a6-cb25-427e-8c3d-501c51753503",
            price: 4500,
            quantity: 3,
            type: "product",
            image: "https://s3.us-east-1.wasabisys.com/streets-product-prod/-Nv7OCieGiC2p7jvGGFO/0.jpg",
            name: "VIP Ticket",
            details: "This is a vip ticket (item). The price has definitely gone up!!",
            responses: [
                {
                    "response": "Shenna Scott ",
                    "title": "What is your Name?"
                },
            ]
        }
    ],
    subtotal: 13500,
    fee: 561,
    tax: 810,
    total: 14871
};

module.exports = order;