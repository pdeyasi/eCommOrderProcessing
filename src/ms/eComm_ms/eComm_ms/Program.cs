using eComm_ms.DBA;
using eComm_ms.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: "AllowAll",
                      policy =>
                      {
                          policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
                      });
});

builder.Services.AddDbContext<ECommDbContext>(options =>
    options.UseSqlite("Data Source=\"C:\\Users\\HP\\Documents\\eCommOrderProcessing\\src\\db\\eCommDB.db\""));
builder.Services.AddControllers();
builder.Services.AddScoped<OrderDetailsService>();

var app = builder.Build();

app.UseHttpsRedirection();
app.UseAuthorization();
app.UseCors("AllowAll");
app.UseStaticFiles();
app.MapControllers();
app.Run();