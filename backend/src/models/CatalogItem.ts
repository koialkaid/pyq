import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface CatalogItemAttributes {
  id: string;
  categoryId: string;
  title: string;
  configuration: string;
  description: string;
  imageMediaId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

type CatalogItemCreationAttributes = Optional<
  CatalogItemAttributes,
  "id" | "configuration" | "description" | "imageMediaId" | "sortOrder" | "createdAt" | "updatedAt"
>;

class CatalogItem
  extends Model<CatalogItemAttributes, CatalogItemCreationAttributes>
  implements CatalogItemAttributes
{
  declare id: string;
  declare categoryId: string;
  declare title: string;
  declare configuration: string;
  declare description: string;
  declare imageMediaId: string | null;
  declare sortOrder: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

CatalogItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "category_id",
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    configuration: {
      type: DataTypes.STRING(300),
      allowNull: false,
      defaultValue: "",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
    },
    imageMediaId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "image_media_id",
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "sort_order",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "catalog_items",
    underscored: true,
    indexes: [{ fields: ["category_id", "sort_order"] }],
  }
);

export default CatalogItem;
