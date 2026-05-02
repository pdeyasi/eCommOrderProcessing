using eComm_ms.DBA;
using eComm_ms.Models;
using Microsoft.AspNetCore.Mvc;

namespace eComm_ms.Controllers
{
    /// <summary>
    /// API controller that provides endpoints to query and manage orders.
    /// Orders can only be retrieved via: User ID, Status ID, or Order ID.
    /// No generic endpoint to retrieve all orders.
    /// </summary>
    [ApiController]
    [Route("/orders")]
    public class OrdersController : ControllerBase
    {
        /// <summary>
        /// Database context used to access order data.
        /// </summary>
        private readonly ECommDbContext _context;

        /// <summary>
        /// Initializes a new instance of the <see cref="OrdersController"/> class.
        /// </summary>
        /// <param name="context">The database context to be used by the controller.</param>
        public OrdersController(ECommDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Retrieves orders by a specific user ID with pagination.
        /// </summary>
        /// <param name="userId">The user ID to filter orders.</param>
        /// <param name="pageNumber">The page number (1-based). Default is 1.</param>
        /// <param name="pageSize">The number of orders per page. Default is 10, max 100.</param>
        /// <returns>
        /// 200 OK with paginated orders list for the specified user.
        /// 404 Not Found if user has no orders.
        /// </returns>
        [HttpGet("user/{userId:long}", Name = "getordersbyuserid")]
        public ActionResult<object> GetByUserId(long userId, int pageNumber = 1, int pageSize = 10)
        {
            // Validate input
            if (userId <= 0)
            {
                return BadRequest(new { message = "User ID must be greater than 0" });
            }

            pageNumber = ValidatePageNumber(pageNumber);
            pageSize = ValidatePageSize(pageSize);

            // Calculate skip count
            var skipCount = (pageNumber - 1) * pageSize;

            // Get total count for this user
            var totalCount = _context.Orders.Where(o => o.UserId == userId).Count();

            if (totalCount == 0)
            {
                return NotFound(new { message = $"No orders found for user ID: {userId}" });
            }

            // Get paginated orders for this user
            var orders = _context.Orders
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.Id)
                .Skip(skipCount)
                .Take(pageSize)
                .ToList();

            return Ok(new
            {
                data = orders,
                userId = userId,
                pageNumber = pageNumber,
                pageSize = pageSize,
                totalCount = totalCount,
                totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            });
        }

        /// <summary>
        /// Retrieves orders by a specific status ID with pagination.
        /// </summary>
        /// <param name="statusId">The status ID to filter orders.</param>
        /// <param name="pageNumber">The page number (1-based). Default is 1.</param>
        /// <param name="pageSize">The number of orders per page. Default is 10, max 100.</param>
        /// <returns>
        /// 200 OK with paginated orders list for the specified status.
        /// 404 Not Found if no orders exist for the status.
        /// </returns>
        [HttpGet("status/{statusId:long}", Name = "getordersbystatus")]
        public ActionResult<object> GetByStatusId(long statusId, int pageNumber = 1, int pageSize = 10)
        {
            // Validate input
            if (statusId <= 0)
            {
                return BadRequest(new { message = "Status ID must be greater than 0" });
            }

            pageNumber = ValidatePageNumber(pageNumber);
            pageSize = ValidatePageSize(pageSize);

            // Calculate skip count
            var skipCount = (pageNumber - 1) * pageSize;

            // Get total count for this status
            var totalCount = _context.Orders.Where(o => o.StatusId == statusId).Count();

            if (totalCount == 0)
            {
                return NotFound(new { message = $"No orders found for status ID: {statusId}" });
            }

            // Get paginated orders for this status
            var orders = _context.Orders
                .Where(o => o.StatusId == statusId)
                .OrderByDescending(o => o.Id)
                .Skip(skipCount)
                .Take(pageSize)
                .ToList();

            return Ok(new
            {
                data = orders,
                statusId = statusId,
                pageNumber = pageNumber,
                pageSize = pageSize,
                totalCount = totalCount,
                totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            });
        }

        /// <summary>
        /// Retrieves a single order by its ID.
        /// </summary>
        /// <param name="id">The order ID to retrieve.</param>
        /// <returns>
        /// 200 OK with the order when found; otherwise 404 Not Found.
        /// </returns>
        [HttpGet("{id:long}", Name = "getorderbyid")]
        public ActionResult<Orders> GetById(long id)
        {
            if (id <= 0)
            {
                return BadRequest(new { message = "Order ID must be greater than 0" });
            }

            var order = _context.Orders.FirstOrDefault(o => o.Id == id);

            if (order == null)
            {
                return NotFound(new { message = $"Order not found with ID: {id}" });
            }

            return Ok(order);
        }

        /// <summary>
        /// Creates a new order.
        /// </summary>
        /// <param name="order">The order object containing order details.</param>
        /// <returns>
        /// 201 Created with the newly created order and its ID.
        /// 400 Bad Request if the order data is invalid.
        /// </returns>
        [HttpPost("add", Name = "createorder")]
        public ActionResult<object> CreateOrder([FromBody] Orders order)
        {
            // Validate input
            if (order == null)
            {
                return BadRequest(new { message = "Order data is required" });
            }

            if (order.UserId <= 0)
            {
                return BadRequest(new { message = "User ID must be greater than 0" });
            }

            if (order.ProductId <= 0)
            {
                return BadRequest(new { message = "Product ID must be greater than 0" });
            }

            if (order.StatusId <= 0)
            {
                return BadRequest(new { message = "Status ID must be greater than 0" });
            }

            if (order.LastUpdatedByUserId <= 0)
            {
                return BadRequest(new { message = "Last Updated By ID must be greater than 0" });
            }

            // Set timestamps
            order.AddedOn = DateTime.Now.ToString("O");
            order.LastUpdatedOn = DateTime.Now.ToString("O");

            try
            {
                // Add and save the order
                _context.Orders.Add(order);
                _context.SaveChanges();

                return CreatedAtRoute("getorderbyid", new { id = order.Id }, new
                {
                    message = "Order created successfully",
                    order = order
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"An error occurred while creating the order: {ex.Message}" });
            }
        }

        /// <summary>
        /// Updates the status of an existing order.
        /// </summary>
        /// <param name="id">The order ID to update.</param>
        /// <param name="statusId">The new status ID.</param>
        /// <param name="updatedById">The ID of the user performing the update.</param>
        /// <returns>
        /// 200 OK with the updated order.
        /// 400 Bad Request if the input is invalid.
        /// 404 Not Found if the order does not exist.
        /// </returns>
        [HttpPut("{id:long}/status", Name = "updateorderstatus")]
        public ActionResult<object> UpdateOrderStatus(long id, [FromQuery] long statusId, [FromQuery] long updatedById)
        {
            // Validate input
            if (id <= 0)
            {
                return BadRequest(new { message = "Order ID must be greater than 0" });
            }

            if (statusId <= 0)
            {
                return BadRequest(new { message = "Status ID must be greater than 0" });
            }

            if (updatedById <= 0)
            {
                return BadRequest(new { message = "Updated By ID must be greater than 0" });
            }

            // Find the order
            var order = _context.Orders.FirstOrDefault(o => o.Id == id);

            if (order == null)
            {
                return NotFound(new { message = $"Order not found with ID: {id}" });
            }

            // Update status and timestamp
            order.StatusId = statusId;
            order.LastUpdatedByUserId = updatedById;
            order.LastUpdatedOn = DateTime.Now.ToString("O");

            switch(statusId)
            {
                case 2:
                case 3:
                    order.OrderedOn = DateTime.Now.ToString("O");
                    break;
                case 4:
                    order.PackagedOn = DateTime.Now.ToString("O");
                    break; 
                case 5:
                    order.DeliveredOn = DateTime.Now.ToString("O");
                    break;
                case 6:
                case 7:
                    order.CancelledOn = DateTime.Now.ToString("O");
                    break;
                case 8:
                    order.CancellationPaidOn = DateTime.Now.ToString("O");
                    break;
                case 9:
                    order.CancelledOn = DateTime.Now.ToString("O");
                    break;
            }    
            
            try
            {
                _context.SaveChanges();

                return Ok(new
                {
                    message = "Order status updated successfully",
                    order = order
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"An error occurred while updating the order status: {ex.Message}" });
            }
        }

        /// <summary>
        /// Deletes an existing order by its ID.
        /// </summary>
        /// <param name="id">The order ID to delete.</param>
        /// <returns>
        /// 200 OK with a success message when order is deleted.
        /// 400 Bad Request if the order ID is invalid.
        /// 404 Not Found if the order does not exist.
        /// </returns>
        [HttpDelete("{id:long}", Name = "deleteorder")]
        public ActionResult<object> DeleteOrder(long id)
        {
            // Validate input
            if (id <= 0)
            {
                return BadRequest(new { message = "Order ID must be greater than 0" });
            }

            // Find the order
            var order = _context.Orders.FirstOrDefault(o => o.Id == id);

            if (order == null)
            {
                return NotFound(new { message = $"Order not found with ID: {id}" });
            }

            try
            {
                // Remove and save changes
                _context.Orders.Remove(order);
                _context.SaveChanges();

                return Ok(new
                {
                    message = "Order deleted successfully",
                    deletedOrderId = id
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"An error occurred while deleting the order: {ex.Message}" });
            }
        }

        /// <summary>
        /// Validates and normalizes the page number.
        /// </summary>
        private static int ValidatePageNumber(int pageNumber)
        {
            return pageNumber < 1 ? 1 : pageNumber;
        }

        /// <summary>
        /// Validates and normalizes the page size (max 100).
        /// </summary>
        private static int ValidatePageSize(int pageSize)
        {
            if (pageSize < 1) return 10;
            if (pageSize > 100) return 100;
            return pageSize;
        }
    }
}