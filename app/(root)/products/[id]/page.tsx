"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { Camera, Loader2, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { IProduct } from "@/models/products.models";
import mongoose from "mongoose";
import { IKImage } from "imagekitio-next";
import { IVariant } from "@/models/variants.model";

const ProductPage = () => {
  const { id }: { id: string } = useParams();
  const [product, setProduct] = useState<IProduct>();
  const [selectedVariant, setSelectedVariant] = useState<IVariant>();
  const { data: session, status } = useSession();
  const [isPending, setIsPending] = useState<boolean>(false);
  const [isPaymentPending, setIsPaymentPending] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          toast.success(data.message);
          setProduct(data?.data);
          setSelectedVariant(data?.data?.variants[0]);
        } else {
          toast.error(data.message);
          router.push("/products");
        }
      });
  }, [id, router]);

  const handleVariantChange = (type: string) => {
    const selected = product?.variants?.find(
      (variant: IVariant) => variant?.type === type
    );
    setSelectedVariant(selected);
  };

  const handleDeleteProduct = async (
    id: mongoose.Types.ObjectId | undefined
  ) => {
    setIsPending(true);
    fetch(`/api/products/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(""),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          toast.success(data.message);
          window.location.reload();
        } else {
          toast.error(data.message);
        }
      })
      .catch(() =>
        toast.error("Something went wrong while deleting the product...")
      )
      .finally(() => setIsPending(false));
  };

  async function handlePayment() {
    setIsPaymentPending(true);
    fetch("/api/orders/place", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId: product?._id,
        variant: selectedVariant,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          const { orderId, amount, currency, dbOrderId } = data.data;

          const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount,
            currency,
            name: "SnapTrade",
            description: `${product?.name} - ${selectedVariant?.type} Version`,
            order_id: orderId,
            handler: function () {
              router.push(`/orders/success/${dbOrderId}`);
            },
            prefill: {
              email: session?.user?.email,
            },
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
        } else {
          toast.error(data.message);
        }
      })
      .catch(() =>
        toast.error("Something went wrong while placing the order...")
      )
      .finally(() => setIsPaymentPending(false));
  }

  return (
    <>
      {status === "loading" ? (
        <div className="w-full h-screen flex justify-center items-center gap-2">
          <Camera className="animate-pulse" size={25} />
          Loading...
        </div>
      ) : (
        <div className="md:max-w-7xl min-h-screen mx-auto p-4">
          {/* Product Information */}
          <Card className="min-h-screen flex flex-col md:flex-row justify-around items-center p-4">
            <CardContent className="md:w-6/12 p-4 flex items-center justify-center">
              {selectedVariant?.previewUrl?.trim() ? (
                <div className="relative">
                  <IKImage
                    src={selectedVariant?.previewUrl}
                    alt={product?.name as string}
                    height={selectedVariant?.dimensions?.height || 500}
                    width={selectedVariant?.dimensions?.width || 500}
                  />
                </div>
              ) : (
                <div className="w-[225px] h-[225px] sm:w-[500px] sm:h-[500px] flex justify-center items-center bg-gray-200">
                  No Image Available
                </div>
              )}
            </CardContent>

            <div className="w-full md:w-6/12 p-4">
              <CardHeader>
                <CardTitle>{product?.name as string}</CardTitle>
                <CardDescription>{product?.description}</CardDescription>
              </CardHeader>

              {/* Variant Selector */}
              <CardFooter className="flex flex-col gap-4">
                <Select
                  onValueChange={(value) => handleVariantChange(value)}
                  value={selectedVariant?.type || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {product?.variants.map((variant: IVariant) => (
                      <SelectItem
                        key={`${variant._id}-${variant.type}`}
                        value={variant.type}
                      >
                        {`${variant.type} - Rs ${variant.price}/-`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {product?.owner === session?.user.id && (
                  <div className="w-full flex flex-row justify-center items-center gap-2">
                    <Button
                      className="w-full flex flex-row items-center justify-center"
                      variant="outline"
                      onClick={() =>
                        router.push(`/products/edit/${product?._id}`)
                      }
                    >
                      <Pencil /> Edit
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full flex flex-row items-center justify-center"
                      onClick={() => handleDeleteProduct(product?._id)}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="animate-spin" /> Deleting
                        </>
                      ) : (
                        <>
                          <Trash2 /> Delete
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <Button
                  className="w-full"
                  variant="default"
                  onClick={handlePayment}
                  disabled={isPaymentPending}
                >
                  {isPaymentPending ? (
                    <div className="flex flex-row items-center justify-center gap-2">
                      <Loader2 className="animate-spin" /> Processing...
                    </div>
                  ) : (
                    <>
                      Buy Now -
                      {selectedVariant?.price
                        ? `Rs ${selectedVariant.price}/-`
                        : "N/A"}
                    </>
                  )}
                </Button>
              </CardFooter>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default ProductPage;
