# eCommOrderProcessing 

**Order Processing System for an eCommerce company**.

MiniShop Pro is a lightweight, responsive eCommerce web application paired with a robust .NET 10.0 microservice backend for comprehensive order management and fulfillment.

---

## Table of Contents
1. [Summary](#summary)
2. [Release Notes and Version History](#release-notes-and-version-history)
3. [Architecture Diagram](#architecture-diagram)
4. [Order Processing Features](#order-processing-features)
5. [Order Pagination & Minor Aspects](#order-pagination--minor-aspects)
6. [Getting Started](#getting-started)
7. [Project Details](#project-details)
8. [Support](#support)

---

## Summary
The eCommOrderProcessing system comprises a frontend single-page application (MiniShop Pro) built with standard web technologies and a `.NET 10` Web API backend microservice (`eComm_ms`). The system handles three distinct user roles: 
* **Client**: Browses products, adds items to the cart, places orders, and tracks/cancels them.
* **Admin**: Oversees the entire operation, views all orders, and manages the fulfillment pipeline.
* **Backend**: System-level account used primarily for automated tasks and status transitions.

It provides end-to-end management of a user's shopping lifecycle, starting from product browsing and cart management, to secure order placement, automated backend approval, and administrative shipment tracking. 

---

## Release Notes and Version History
* **Version:** 1.0.0.0
* **License:** MIT License, Copyright (c) 2026 pdeyasi.
* **Initial Release Highlights:** 
  * Implemented PBKDF2 user authentication and authorization logic.
  * Created product catalogs and shopping cart management workflows.
  * Designed a complete order state machine tracking 10 distinct statuses.
  * Added `OrderStatusUpdateService` background service for automated order processing (sweeping unapproved orders every 5 minutes).
* **Merged Pull Requests:**
  * [#1 - Develop => Create first version of the application => main](https://github.com/pdeyasi/eCommOrderProcessing/pull/2)
  * [#2 - Develop => Manage Orders and minor bug fixes => main](https://github.com/pdeyasi/eCommOrderProcessing/pull/3)
  * [#3 - Develop => Order processing refinement => main](https://github.com/pdeyasi/eCommOrderProcessing/pull/4)
  * [#4 - Develop => Fix minor bugs in order processing status updates and conditions => main](https://github.com/pdeyasi/eCommOrderProcessing/pull/5)
---

## Architecture Diagram

The system operates on a standard client-server architecture utilizing a background worker for asynchronous tasks.
```text
+---------------------------------------------------------+
|                  MiniShop Pro Frontend                  |
|  (HTML5 / CSS3 / Vanilla JS - Role-Based Routing UI)    |
+---------------------------+-----------------------------+
                            | (REST API via HTTPS:7019)
+---------------------------v-----------------------------+
|               eComm_ms (.NET 10 Web API)                |
|                                                         |
|  [Controllers]                                          |
|  - UsersController: Handles Login/Registration          |
|  - ProductsController: Manages Product Catalog          |
|  - OrdersController: Core Order Management API          |
|  - StatusStateController: Exposes valid workflow states |
|                                                         |
|  [Core Services]                                        |
|  - AuthenticationService: Cryptography (SHA256)         |
|  - OrderDetailsService: Object Relational Mapping (DTO) |
|                                                         |
|  [Background Workers]                                   |
|  - OrderStatusUpdateService: 5-minute automated polling |
+---------------------------+-----------------------------+
                            | (Entity Framework Core 10)
+---------------------------v-----------------------------+
|                 SQLite Database Layer                   |
|                   (eCommDB.db)                          |
+---------------------------------------------------------+
```

## Order Processing Features
The order processing pipeline enforces a strict state machine based on the user's role and selected payment method. 

* **Cart Management:** Items added to a user's cart are saved directly to the database under Status `1` (In Cart).
* **Checkout & Placement:** When checking out, orders are submitted with Status `10` (Placed/Pending System Approval). Users can select between:
  * **Cash on Delivery (COD)**: Payment Mode `0`.
  * **Online Payment**: Payment Mode `1`.
* **Automated Order Processing (The Sweeper):** A background worker (`OrderStatusUpdateService`) runs every 5 minutes to sweep the database for any orders in Status `10`. 
  * It automatically advances COD orders to Status `2` (New Order - COD).
  * It advances Paid orders to Status `3` (New Order - Paid).
* **Administrative Fulfillment Workflow:** `admin` and `backend` users possess specialized UI views to filter orders and update their workflow states. The progression is tightly controlled:
  * New Order (`2` or `3`) -> Packaged In Warehouse (`4`)
  * Packaged In Warehouse (`4`) -> In Transit (`9`)
  * In Transit (`9`) -> Delivered (`5`)
* **Cancellation Workflows:** Clients can cancel orders that are still processing. 
  * If a *paid* order is cancelled, its status shifts to "Cancellation Requested" (`6`), then "Cancellation to be paid" (`7`) once processed by an admin, and ultimately "Cancelled" (`8`). 
  * If an *unpaid COD* order is cancelled, it goes straight to Cancelled (`8`).
* **Visual Timeline Tracking:** Clients have access to a visual "Track Order" modal that dynamically builds a progress timeline based on captured timestamp fields (`OrderedOn`, `PackagedOn`, `DeliveredOn`, `CancelledOn`).

---

## Order Pagination & Minor Aspects
The system is built to scale, and the `OrdersController` strictly enforces performance safeguards.

* **Targeted Query Endpoints:** To prevent massive data dumps, there is no generic "get all orders" endpoint. Orders must be fetched dynamically:
  * By `UserId` (for clients viewing their own history).
  * By `StatusId` (for admins managing fulfillment queues).
* **Pagination Controls:** Both endpoints require `pageNumber` and `pageSize` arguments in the query string.
* **Strict Size Validation:** 
  * If a `pageSize` less than 1 is requested, it defaults to 10. 
  * To prevent database overload, the maximum allowable `pageSize` is strictly capped at 100.
  * A `pageNumber` lower than 1 is automatically normalized to 1.
* **Efficient Database Querying:** The Entity Framework Core queries utilize `.Skip((pageNumber - 1) * pageSize).Take(pageSize)` to retrieve precise blocks of records directly from SQLite.
* **Rich Response Metadata:** The API wraps the paginated order array in an object containing:
  * `pageNumber`
  * `pageSize`
  * `totalCount`
  * `totalPages` (dynamically calculated using `Math.Ceiling(totalCount / pageSize)`)
* **Data Enrichment via DTOs:** The `OrderDetailsService` intercepts database models and maps them into rich `OrderDetailsDto` objects. This attaches the associated `ProductDetailsDto`, `StatusDetailsDto`, and `UserDetailsDto` so the frontend requires exactly *one* API call to render a complete order card.
* **Strict Auditing:** Every status change requires a `lastUpdatedByUserId` parameter and dynamically updates the `LastUpdatedOn` timestamp in the database. 

---

## Getting Started

### Prerequisites
* **Runtime:** [.NET 10.0 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
* **Database:** SQLite (drivers included via NuGet)
* **IDE:** Visual Studio 2022+ or VS Code with C# Dev Kit
* **Browser:** Chrome, Firefox, Safari, or Edge

### Installation Instructions
1. **Clone the repository / Extract Files:** Ensure all files from the provided package are in a local directory.
2. **Configure Database Connection:** The backend expects the SQLite database to be located at an absolute path. Open `Program.cs` in the `eComm_ms` project and update the connection string path to match your local machine:
   ```csharp
   builder.Services.AddDbContext<ECommDbContext>(options =>
       options.UseSqlite(@"Data Source=C:\Path\To\Your\Extracted\Folder\src\db\eCommDB.db"));
   ```
3. **Restore Nuget Dependencies:**
   Navigate to the microservice directory (`src/ms/eComm_ms/eComm_ms/`) and run:
   ```bash
   dotnet restore
   ```
4. **Run the Backend API:
	Start the application using the .NET CLI:
	```bash
	dotnet run --launch-profile "https"
	```
	The API will boot up on https://localhost:7019 and http://localhost:5296.
5. **Run the Frontend:
	Simply open src/ui/index.html in your web browser. No Node.js or Webpack server is required as it runs on pure Vanilla JS.

---
	
## Usage Examples

1. **Register a New User:
	```bash
	curl -X 'POST' \
		'https://localhost:7019/users/add' \
		-H 'Content-Type: application/json' \
		-d '{
		"Username": "new_client",
		"Password": "securepassword"
		}'
	```
2. **Fetch Paginated Orders for Admin (Status 2 = New COD Orders):
	```bash
	curl -X 'GET' \
	'https://localhost:7019/orders/bystatus?statusId=2&pageNumber=1&pageSize=10' \
	-H 'accept: text/plain'
	```

## Project Details

### Tech Stack
* **Frontend:** HTML5, CSS3, Vanilla JavaScript, FontAwesome (Icons).
* **Backend Framework:** .NET 10.0 Web API, ASP.NET Core.
* **ORM:** Entity Framework Core (`Microsoft.EntityFrameworkCore` 10.0.7).
* **Database:** SQLite (`Microsoft.EntityFrameworkCore.Sqlite`, `sqlite-net-pcl`).
* **API Documentation:** OpenAPI/Swagger (`Microsoft.AspNetCore.OpenApi` 10.0.7).

### DB Diagram (Schema)
| Table | Primary Key | Key Columns | Relationships / Notes |
| :--- | :--- | :--- | :--- |
| **Users** | `Id` | `UserId`, `RoleId`, `Password` | `RoleId` defines permissions (Client, Admin, Backend). |
| **Products** | `Id` | `Name`, `Price`, `Icon` | Master catalog of purchasable items. |
| **StatusStates** | `Id` | `Name`, `Description`, `Icon` | Defines the 10 distinct states an order can exist in. |
| **Orders** | `Id` | `PaymentMode`, `DeliveryAddress` | Core transactional table. Contains numerous auditing timestamps (`AddedOn`, `PackagedOn`, `DeliveredOn`, `CancelledOn`). |

### Configuration Details
* **Environment Configuration:** Handled via `appsettings.json` and `appsettings.Development.json` for Serilog/console logging parameters.
* **CORS:** The API uses a global `AllowAll` policy permitting any origin, header, and method. *Note: In a production environment, this should be restricted to the specific frontend domain.*
* **Password Hashing:** Handled internally by `AuthenticationService` using PBKDF2 (`Rfc2898DeriveBytes`) with a 128-bit salt and 256-bit subkey.

### High-Level Folder Structure
```text
eCommOrderProcessing/
├── src/
│   ├── db/                    # Contains eCommDB.db SQLite file
│   ├── ui/                    # Frontend Application
│   │   ├── index.html         # Main SPA entry point
│   │   ├── css/styles.css     # UI Styling
│   │   └── scripts/script.js  # API integration & UI logic
│   └── ms/eComm_ms/           # Backend Microservice Solution
│       ├── Controllers/       # API Route Handlers
│       ├── Models/            # DB Entities & DTOs
│       ├── DBA/               # Entity Framework DbContext
│       └── Services/          # Auth, Mapping, and Background tasks
└── .gitignore                 # Standard VS/NET ignore rules
```

### Roadmap / Future Features
* **Relative DB Pathing:** Update absolute paths in database connection strings to relative paths (`Data Source=../../db/eCommDB.db`) for better environment portability without code changes.
* **JWT Authentication:** Migrate from returning raw User IDs to returning secure, stateless JWT tokens upon login.
* **Unit Testing:** Implement an `xUnit` test suite for the `OrderDetailsService` and state transition logic.

---

## Support
* **Contact Info:** Maintained by pdeyasi.
* **Support/Help:** 
  * For codebase issues, verify that your local `.NET 10.0` environment is active.
  * Ensure your SQLite database is properly pathed in the `Program.cs` file.
  * Check that you have the required NuGet packages restored (`Microsoft.EntityFrameworkCore.Sqlite`, `Microsoft.AspNetCore.OpenApi`).