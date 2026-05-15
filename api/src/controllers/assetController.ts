import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import supabase from "../db";

export class AssetController {
  static async addAsset(req: AuthRequest, res: Response) {
    const { id } = req.params; // case_id
    const { name, data, is_negative } = req.body;
    const userId = req.user?.id;

    if (!name || !data) {
      return res
        .status(400)
        .json({ success: false, message: "Name and data are required" });
    }

    try {
      // Verify ownership of the case
      const { data: cases, error: caseError } = await supabase
        .from("test_cases")
        .select("id")
        .eq("id", id)
        .eq("user_id", userId);

      if (caseError || !cases || cases.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Case not found or unauthorized" });
      }

      const { data: result, error: insertError } = await supabase
        .from("test_assets")
        .insert({
          case_id: id,
          name,
          data: JSON.stringify(data),
          is_negative: is_negative || false,
        })
        .select("id");

      if (insertError) {
        console.error("Add asset error:", insertError);
        return res
          .status(500)
          .json({
            success: false,
            message: "Server error during asset creation",
          });
      }

      res.status(201).json({
        success: true,
        message: "Asset added successfully",
        assetId: result[0].id,
      });
    } catch (error: any) {
      console.error("Add asset error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Server error during asset creation",
        });
    }
  }

  static async getAssetsByCase(req: AuthRequest, res: Response) {
    const { id } = req.params; // case_id
    const userId = req.user?.id;

    try {
      // Verify ownership of the case
      const { data: cases, error: caseError } = await supabase
        .from("test_cases")
        .select("id")
        .eq("id", id)
        .eq("user_id", userId);

      if (caseError || !cases || cases.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Case not found or unauthorized" });
      }

      const { data: rows, error: assetsError } = await supabase
        .from("test_assets")
        .select("*")
        .eq("case_id", id)
        .order("created_at", { ascending: false });

      if (assetsError) {
        console.error("Get assets error:", assetsError);
        return res
          .status(500)
          .json({ success: false, message: "Server error fetching assets" });
      }

      res.json({
        success: true,
        assets: rows,
      });
    } catch (error: any) {
      console.error("Get assets error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error fetching assets" });
    }
  }

  static async deleteAsset(req: AuthRequest, res: Response) {
    const { id } = req.params; // asset_id
    const userId = req.user?.id;

    try {
      // Complex join to verify user ownership of the asset via test_cases
      const { data: rows, error } = await supabase
        .from("test_assets")
        .select("id")
        .eq("id", id)
        .eq("test_cases.user_id", userId); // This might not work directly, need to join

      // Actually, Supabase doesn't support joins in select with eq on joined table like that.
      // Better to do a separate query or use RPC.

      // For simplicity, fetch the asset and check case ownership.
      const { data: assets, error: assetError } = await supabase
        .from("test_assets")
        .select("case_id")
        .eq("id", id);

      if (assetError || !assets || assets.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Asset not found" });
      }

      const caseId = assets[0].case_id;

      const { data: cases, error: caseError } = await supabase
        .from("test_cases")
        .select("id")
        .eq("id", caseId)
        .eq("user_id", userId);

      if (caseError || !cases || cases.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Asset not found or unauthorized" });
      }

      const { error: deleteError } = await supabase
        .from("test_assets")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("Delete asset error:", deleteError);
        return res
          .status(500)
          .json({
            success: false,
            message: "Server error during asset deletion",
          });
      }

      res.json({
        success: true,
        message: "Asset deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete asset error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Server error during asset deletion",
        });
    }
  }
}