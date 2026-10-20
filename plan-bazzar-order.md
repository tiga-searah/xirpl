# Bazzar Order

This is a feature for recaping bazzar order of a special event.

This feature serve under the `/bazzar-orders` endpoint prefix for both API and frontend web.

## Order Detail

Every order should include:
- Customer Name: name of who ordered
- Seller: name of student that recive the order
- Quantity: amount of items ordered (group in 2: food & drink)
- Price: the total price of this order
- Note: optional note

## Price

- Drink: Rp5.000,00
- Food: Rp5.000,00

## Permission

Only the user with the id of `d1f8f009-f157-49eb-abc8-44ae6a55a409` or users with `developer` role can access this page and create, read, edit, and delete entries.

## About Database

Production database is isolated, so you MUST use local database.
You may need to make a new docker container for the database to test, etc...

Use @drizzle-data-2026-10-20T02_01_09.793Z.csv to seed the local database's users table
