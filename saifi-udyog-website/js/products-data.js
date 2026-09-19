/**
 * SAIFI UDYOG — Product Catalogue Data
 * Add, edit or remove products here. The catalogue page renders automatically.
 */
const CATALOGUE_DATA = [
  {
    id: 'sofa-seating',
    title: 'Sofa & Seating',
    description: 'Comfortable and stylish seating solutions for living rooms and lounges.',
    subcategories: [
      {
        name: 'Sofa Sets',
        products: [
          { name: 'Classic 3-Seater Sofa', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80', description: 'A timeless three-seater sofa with plush cushioning and elegant upholstery, perfect for modern living rooms.' },
          { name: 'L-Shaped Sectional Sofa', image: 'https://images.unsplash.com/photo-1493663284031-b7e00a55f922?w=600&q=80', description: 'Spacious L-shaped design that maximises seating while adding a contemporary touch to your space.' },
          { name: 'Compact 2-Seater Sofa', image: 'https://images.unsplash.com/photo-1540574163026-d643e9bcaad3?w=600&q=80', description: 'Ideal for smaller spaces, this two-seater offers comfort without compromising on style.' }
        ]
      },
      {
        name: 'Sofa Chairs',
        products: [
          { name: 'Accent Armchair', image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&q=80', description: 'A statement armchair with refined curves and soft fabric, designed for reading corners and lounges.' },
          { name: 'Recliner Sofa Chair', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80', description: 'Relax in comfort with this reclining sofa chair featuring premium padding and smooth mechanism.' }
        ]
      },
      {
        name: 'Lounge Chairs',
        products: [
          { name: 'Modern Lounge Chair', image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=600&q=80', description: 'Sleek lounge chair with minimalist design, perfect for waiting areas and modern interiors.' },
          { name: 'Wingback Lounge Chair', image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80', description: 'Classic wingback silhouette with deep seating for ultimate relaxation in any room.' }
        ]
      },
      {
        name: 'Other Seating',
        products: [
          { name: 'Bench Seating', image: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600&q=80', description: 'Versatile bench seating suitable for entryways, dining areas and commercial spaces.' },
          { name: 'Ottoman Pouf', image: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=600&q=80', description: 'Soft ottoman pouf that doubles as extra seating or a footrest for your sofa set.' }
        ]
      }
    ]
  },
  {
    id: 'office-furniture',
    title: 'Office Furniture',
    description: 'Functional and ergonomic furniture designed for productive workspaces.',
    subcategories: [
      {
        name: 'Office Chairs',
        products: [
          { name: 'Executive Office Chair', image: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600&q=80', description: 'High-back executive chair with lumbar support, adjustable height and premium upholstery.' },
          { name: 'Ergonomic Task Chair', image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=600&q=80', description: 'Designed for long hours of work with breathable mesh back and adjustable armrests.' },
          { name: 'Visitor Chair', image: 'https://images.unsplash.com/photo-1611269146515-503b3885b1fa?w=600&q=80', description: 'Comfortable visitor seating for reception areas, meeting rooms and waiting lounges.' }
        ]
      },
      {
        name: 'Office Desks',
        products: [
          { name: 'Executive Desk', image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&q=80', description: 'Spacious executive desk with built-in storage drawers and a clean, professional finish.' },
          { name: 'Computer Desk', image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=600&q=80', description: 'Compact computer desk with cable management and ample surface area for monitors and accessories.' }
        ]
      },
      {
        name: 'Workstations',
        products: [
          { name: 'Linear Workstation', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80', description: 'Modular linear workstation system for open-plan offices with privacy panels and storage.' },
          { name: 'L-Shaped Workstation', image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&q=80', description: 'Corner workstation layout offering maximum desk space for multitasking professionals.' }
        ]
      },
      {
        name: 'Conference Tables',
        products: [
          { name: 'Boardroom Conference Table', image: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=600&q=80', description: 'Large conference table with premium wood finish, ideal for boardrooms and meeting halls.' },
          { name: 'Modular Meeting Table', image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80', description: 'Flexible modular meeting table that can be configured for different group sizes.' }
        ]
      }
    ]
  },
  {
    id: 'home-furniture',
    title: 'Home Furniture',
    description: 'Beautiful furniture pieces to make every room in your home feel complete.',
    subcategories: [
      {
        name: 'Beds',
        products: [
          { name: 'King Size Bed', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80', description: 'Elegant king size bed frame with a sturdy headboard and premium wood construction.' },
          { name: 'Queen Size Bed', image: 'https://images.unsplash.com/photo-1522771739844-6ce9f6e380c0?w=600&q=80', description: 'Stylish queen size bed with clean lines and a warm finish for modern bedrooms.' },
          { name: 'Single Bed', image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80', description: 'Compact single bed perfect for guest rooms, children\'s rooms and studio apartments.' }
        ]
      },
      {
        name: 'Tables',
        products: [
          { name: 'Dining Table', image: 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=600&q=80', description: 'Solid wood dining table with seating for six, crafted for family meals and gatherings.' },
          { name: 'Coffee Table', image: 'https://images.unsplash.com/photo-1611269146515-503b3885b1fa?w=600&q=80', description: 'Low-profile coffee table with a smooth surface, complementing any living room setup.' },
          { name: 'Side Table', image: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=600&q=80', description: 'Compact side table ideal for placing beside sofas, beds or accent chairs.' }
        ]
      },
      {
        name: 'Chairs',
        products: [
          { name: 'Dining Chair', image: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=600&q=80', description: 'Comfortable dining chair with cushioned seat and durable wooden frame.' },
          { name: 'Accent Chair', image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&q=80', description: 'Stylish accent chair that adds character and extra seating to any room.' }
        ]
      },
      {
        name: 'Storage Furniture',
        products: [
          { name: 'Wardrobe', image: 'https://images.unsplash.com/photo-1595428774223-ef5262417080?w=600&q=80', description: 'Spacious wardrobe with multiple compartments for organised clothing storage.' },
          { name: 'Chest of Drawers', image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&q=80', description: 'Multi-drawer chest with smooth handles and a refined wood finish for bedrooms.' }
        ]
      }
    ]
  },
  {
    id: 'other-furniture',
    title: 'Other Furniture',
    description: 'Additional furniture solutions including storage, shelving and custom pieces.',
    subcategories: [
      {
        name: 'Cabinets',
        products: [
          { name: 'Display Cabinet', image: 'https://images.unsplash.com/photo-1595428774223-ef5262417080?w=600&q=80', description: 'Glass-front display cabinet for showcasing collectibles, books and decorative items.' },
          { name: 'Storage Cabinet', image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&q=80', description: 'Multi-purpose storage cabinet with adjustable shelves for home or office use.' }
        ]
      },
      {
        name: 'Shelves',
        products: [
          { name: 'Wall Shelf Unit', image: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=600&q=80', description: 'Floating wall shelf unit for displaying books, plants and decorative accents.' },
          { name: 'Bookcase', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80', description: 'Tall bookcase with multiple tiers, perfect for libraries, studies and living rooms.' }
        ]
      },
      {
        name: 'Custom Furniture',
        products: [
          { name: 'Custom Furniture', image: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&q=80', description: 'Need something unique? We create custom furniture tailored to your space, style and requirements.' },
          { name: 'Bespoke Interior Solutions', image: 'https://images.unsplash.com/photo-1618221197170-2f1629a2d1ee?w=600&q=80', description: 'Complete interior furniture solutions designed and manufactured to fit your specific needs.' }
        ]
      }
    ]
  }
];
