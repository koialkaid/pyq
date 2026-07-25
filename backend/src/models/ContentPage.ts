import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface ContentPageAttributes {
  id: string;
  slug: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

type ContentPageCreationAttributes = Optional<
  ContentPageAttributes,
  "id" | "createdAt" | "updatedAt"
>;

class ContentPage
  extends Model<ContentPageAttributes, ContentPageCreationAttributes>
  implements ContentPageAttributes
{
  declare id: string;
  declare slug: string;
  declare authorId: string;
  declare content: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ContentPage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "author_id",
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
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
    tableName: "content_pages",
    underscored: true,
  }
);

export default ContentPage;
