# GreenHub

## Overview

## Features

## Tech Stack

## Project Structure

## Installation

## Environment Variables

## Running the Project

# API Documentation

## Base URL

``` text
http://localhost:5000/api/v1
```

------------------------------------------------------------------------

## Authentication Endpoints

### Register User

**Endpoint**

``` http
POST /auth/register
```

#### Request Body

``` json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Response --- `201 Created`

``` json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "60f7c5c5d99d4a2a8c8b4567",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

------------------------------------------------------------------------

### Login User

**Endpoint**

``` http
POST /auth/login
```

#### Request Body

``` json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Response --- `200 OK`

``` json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "60f7c5c5d99d4a2a8c8b4567",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer"
    }
  }
}
```

> **Authentication:** Use the returned JWT token in the `Authorization`
> header for protected endpoints.
>
> ``` http
> Authorization: Bearer <token>
> ```

------------------------------------------------------------------------

## Product Endpoints

### Create Product

**Admin Only**

**Endpoint**

``` http
POST /products
Authorization: Bearer <token>
```

#### Request Body

``` json
{
  "name": "Wireless Headphones Pro",
  "description": "Premium wireless headphones with active noise cancellation",
  "price": 149.99,
  "compareAtPrice": 199.99,
  "category": "electronics",
  "subcategory": "audio",
  "brand": "SoundMax",
  "tags": [
    "wireless",
    "headphones",
    "premium"
  ],
  "stockQuantity": 50,
  "lowStockThreshold": 5,
  "weight": 0.3,
  "images": [
    {
      "url": "https://example.com/images/headphones-1.jpg",
      "alt": "Headphones front view",
      "isPrimary": true
    }
  ],
  "variants": [
    {
      "name": "Black",
      "price": 149.99,
      "stock": 25,
      "attributes": {
        "color": "Black",
        "size": "Standard"
      }
    }
  ],
  "status": "published",
  "isFeatured": true,
  "seo": {
    "title": "Best Wireless Headphones Pro",
    "description": "Shop the best wireless headphones with noise cancellation",
    "keywords": [
      "headphones",
      "wireless",
      "premium"
    ]
  }
}
```

#### Response --- `201 Created`

``` json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "60f7c5c5d99d4a2a8c8b4568",
    "sku": "SOU-4X7K",
    "name": "Wireless Headphones Pro",
    "price": 149.99,
    "compareAtPrice": 199.99,
    "discountPercentage": 25,
    "category": "electronics",
    "isAvailable": true,
    "rating": {
      "average": 0,
      "count": 0
    }
  }
}
```

------------------------------------------------------------------------

### Get All Products

**Endpoint**

``` http
GET /products
```

#### Query Parameters

  --------------------------------------------------------------------------
  Parameter        Type                           Default Description
  ---------------- ---------------- --------------------- ------------------
  `page`           number                             `1` Page number

  `perPage`        number                            `20` Items per page

  `sort`           string                    `-createdAt` Sort field (`-`
                                                          means descending)

  `search`         string                             --- Search term

  `category`       string                             --- Filter by category

  `status`         string                             --- `draft`,
                                                          `published`, or
                                                          `archived`

  `minPrice`       number                             --- Minimum price

  `maxPrice`       number                             --- Maximum price

  `isFeatured`     boolean                            --- Filter featured
                                                          products
                                                          (`true`/`false`)

  `inStock`        boolean                            --- Filter products by
                                                          stock availability
                                                          (`true`/`false`)
  --------------------------------------------------------------------------

#### Example Request

``` http
GET /products?page=1&perPage=20&category=electronics&inStock=true
```

#### Response --- `200 OK`

``` json
{
  "success": true,
  "data": {
    "items": [],
    "totalItems": 150,
    "page": 1,
    "perPage": 20,
    "totalPages": 8
  }
}
```

------------------------------------------------------------------------

## Endpoint Summary

  Method   Endpoint           Authentication   Access
  -------- ------------------ ---------------- --------
  `POST`   `/auth/register`   No               Public
  `POST`   `/auth/login`      No               Public
  `POST`   `/products`        Bearer Token     Admin
  `GET`    `/products`        No               Public

------------------------------------------------------------------------

## Response Format

Successful API responses follow a consistent structure:

``` json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

For paginated resources, the `data` object contains the collection and
pagination information.

------------------------------------------------------------------------

## Notes

-   The API uses the base URL `http://localhost:5000/api/v1` in the
    local development environment.
-   Protected endpoints require a valid JWT access token.
-   Product creation is restricted to administrators.
-   Product listing supports pagination, sorting, searching, filtering,
    and stock/featured status filters.
-   Prices in the examples are represented as numeric values.
-   Replace example IDs, URLs, credentials, and tokens with values from
    your actual environment.

## Deployment