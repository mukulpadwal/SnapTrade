import { auth } from "@/auth";
import ApiResponse from "@/lib/api-response";
import { connectToDB } from "@/lib/db";
import { Product } from "@/models";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        new ApiResponse("Unauthorized Request...", 400),
        { status: 400 }
      );
    }

    // Get the data from the client
    const { name, description, variants } = await request.json();

    // Validate the data
    if ([name, description].some((field) => !field || field.trim() === "")) {
      return NextResponse.json(
        new ApiResponse("Either name or description is missing", 400),
        { status: 400 }
      );
    }

    if (variants.length === 0) {
      return NextResponse.json(
        new ApiResponse("Please select a variant...", 400),
        { status: 400 }
      );
    }

    await connectToDB();

    const product = await Product.create({
      name,
      description,
      variants,
      owner: session.user.id,
    });

    if (!product) {
      return NextResponse.json(
        new ApiResponse(
          "Could not list your product. Please try again...",
          400
        ),
        { status: 400 }
      );
    }

    return NextResponse.json(
      new ApiResponse("Product listed successfully...", 201, product),
      { status: 201 }
    );
  } catch (error) {
    console.error("Something went wrong while listing your product ", error);
    return NextResponse.json(
      new ApiResponse("Internal Server Error while listing your product", 500),
      { status: 500 }
    );
  }
}
