import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Database, Calendar, Clock, Table2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";

interface DatabaseMetadata {
  id: string;
  last_updated: string;
  total_cards: number;
  description: string;
}

export function DatabaseUpdateModal() {
  const { data: metadata, isLoading, error } = useQuery<DatabaseMetadata>({
    queryKey: ['/api/metadata'],
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const formattedDate = metadata?.last_updated
    ? format(new Date(metadata.last_updated), "MMMM d, yyyy")
    : "Unknown";
    
  const formattedTime = metadata?.last_updated
    ? format(new Date(metadata.last_updated), "h:mm a")
    : "";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs py-1 h-auto">
          <Database className="h-3.5 w-3.5" />
          <span>Database Info</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Card Database Information
          </DialogTitle>
          <DialogDescription>
            Details about the MTG card database and when it was last updated.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <p className="text-sm text-muted-foreground">Loading database information...</p>
            </div>
          ) : error ? (
            <div className="p-4 border border-red-200 rounded-md bg-red-50 dark:bg-red-950/20 dark:border-red-900">
              <p className="text-sm text-red-600 dark:text-red-400">
                Error loading database information. Please try again later.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 p-3 rounded-md border bg-muted/40">
                  <div className="flex items-center text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    Last Updated
                  </div>
                  <p className="text-lg font-semibold">{formattedDate}</p>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    {formattedTime}
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5 p-3 rounded-md border bg-muted/40">
                  <div className="flex items-center text-sm font-medium text-muted-foreground">
                    <Table2 className="h-4 w-4 mr-2" />
                    Total Cards
                  </div>
                  <p className="text-lg font-semibold">
                    {metadata?.total_cards?.toLocaleString() || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    From the latest MTGJSON data
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="text-sm text-muted-foreground">
                <p>
                  The card database is automatically updated from MTGJSON.com when new sets are released or card data is updated.
                </p>
                <p className="mt-2">
                  Source: <span className="font-semibold">AllPrintings.json</span> from MTGJSON.com
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}