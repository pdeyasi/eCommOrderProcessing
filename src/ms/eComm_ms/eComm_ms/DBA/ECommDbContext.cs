using eComm_ms.Models;
using Microsoft.EntityFrameworkCore;

namespace eComm_ms.DBA
{
    public class ECommDbContext : DbContext
    {
        public ECommDbContext(DbContextOptions<ECommDbContext> options) : base(options)
        {
        }

        public DbSet<Products> Products { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure Products entity
            modelBuilder.Entity<Products>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired();
                entity.Property(e => e.Price).IsRequired().HasPrecision(18, 2);
                entity.Property(e => e.Icon).IsRequired();
            });
        }
    }
}
