import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

export type CatalogCollection = "equipment" | "labs";

interface CatalogCategoryAttributes {
  id: string;
  collection: CatalogCollection;
  name: string;
  intro: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

type CatalogCategoryCreationAttributes = Optional<
  CatalogCategoryAttributes,
  "id" | "intro" | "sortOrder" | "createdAt" | "updatedAt"
>;

class CatalogCategory
  extends Model<CatalogCategoryAttributes, CatalogCategoryCreationAttributes>
  implements CatalogCategoryAttributes
{
  declare id: string;
  declare collection: CatalogCollection;
  declare name: string;
  declare intro: string;
  declare sortOrder: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

CatalogCategory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    collection: {
      type: DataTypes.ENUM("equipment", "labs"),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    intro: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
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
    tableName: "catalog_categories",
    underscored: true,
    indexes: [{ fields: ["collection", "sort_order"] }],
  }
);

export default CatalogCategory;
