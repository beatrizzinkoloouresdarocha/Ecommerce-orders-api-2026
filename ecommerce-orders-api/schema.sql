generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Product {
  id         Int         @id @default(autoincrement())
  name       String
  price      Float
  quantity   Int
  orderItems OrderItem[]
}

model Order {
  id        Int         @id @default(autoincrement())
  status    String      @default("CONFIRMED")
  createdAt DateTime    @default(now())
  items     OrderItem[]
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int
  productId Int
  quantity  Int
  order     Order   @relation(fields: [orderId], references: [id])
  product   Product @relation(fields: [productId], references: [id])
}