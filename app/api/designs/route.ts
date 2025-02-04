import { supabase } from '../../lib/supabaseClient'
import { NextResponse } from 'next/server'

interface Design {
  id: string;
  title: string;
  description: string;
  images: string[];
  fabrics: {
    name: string;
    image: string;
    price: number;
    colors: { name: string; image: string; }[];
  }[];
}

export async function GET() {
  try {
    const { data: designs, error } = await supabase
      .from('designs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(designs)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const fabricsData = JSON.parse(formData.get("fabrics") as string)
    const existingImages = JSON.parse(formData.get("existingImages") as string || "[]")
    
    // Handle new images
    const images = formData.getAll("images") as File[]
    const imageUrls: string[] = [...existingImages] // Start with existing images
    
    // Upload new images
    for (const image of images) {
      try {
        const { data, error } = await supabase.storage
          .from('design-images')
          .upload(`${Date.now()}-${image.name}`, image)
        
        if (error) {
          console.error('Storage error:', error)
          continue
        }
        
        const urlData = supabase.storage
          .from('design-images')
          .getPublicUrl(data.path)
        
        imageUrls.push(urlData.data.publicUrl)
      } catch (error) {
        console.error('Image upload error:', error)
      }
    }

    // Handle fabric images
    const fabricImages = formData.getAll("fabricImages") as File[]
    let fabricImageIndex = 0
    
    // Process fabrics and their images
    const processedFabrics = await Promise.all(fabricsData.map(async (fabric: any) => {
      let fabricImageUrl = fabric.image
      
      if (fabricImages[fabricImageIndex]) {
        const image = fabricImages[fabricImageIndex]
        fabricImageIndex++
        
        try {
          const { data, error } = await supabase.storage
            .from('fabric-images')
            .upload(`${Date.now()}-${image.name}`, image)
          
          if (!error && data) {
            const urlData = supabase.storage
              .from('fabric-images')
              .getPublicUrl(data.path)
            fabricImageUrl = urlData.data.publicUrl
          }
        } catch (error) {
          console.error('Fabric image upload error:', error)
        }
      }
      
      return {
        ...fabric,
        image: fabricImageUrl
      }
    }))

    const { data, error } = await supabase
      .from('designs')
      .insert({
        title: formData.get("title"),
        description: formData.get("description"),
        images: imageUrls,
        fabrics: processedFabrics
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { message: "Design submitted successfully", design: data }, 
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal Server Error',
      details: error
    }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const formData = await request.formData()
    const designId = formData.get("id")
    const fabricsData = JSON.parse(formData.get("fabrics") as string)
    const existingImages = JSON.parse(formData.get("existingImages") as string || "[]")
    
    // Handle new images
    const images = formData.getAll("images") as File[]
    const imageUrls: string[] = [...existingImages]
    
    // Upload new images
    for (const image of images) {
      try {
        const { data, error } = await supabase.storage
          .from('design-images')
          .upload(`${Date.now()}-${image.name}`, image)
        
        if (error) {
          console.error('Storage error:', error)
          continue
        }
        
        const urlData = supabase.storage
          .from('design-images')
          .getPublicUrl(data.path)
        
        imageUrls.push(urlData.data.publicUrl)
      } catch (error) {
        console.error('Image upload error:', error)
      }
    }

    // Process fabrics similar to POST
    const fabricImages = formData.getAll("fabricImages") as File[]
    let fabricImageIndex = 0
    
    const processedFabrics = await Promise.all(fabricsData.map(async (fabric: any) => {
      let fabricImageUrl = fabric.image
      
      if (fabricImages[fabricImageIndex]) {
        const image = fabricImages[fabricImageIndex]
        fabricImageIndex++
        
        try {
          const { data, error } = await supabase.storage
            .from('fabric-images')
            .upload(`${Date.now()}-${image.name}`, image)
          
          if (!error && data) {
            const urlData = supabase.storage
              .from('fabric-images')
              .getPublicUrl(data.path)
            fabricImageUrl = urlData.data.publicUrl
          }
        } catch (error) {
          console.error('Fabric image upload error:', error)
        }
      }
      
      return {
        ...fabric,
        image: fabricImageUrl
      }
    }))

    const { data, error } = await supabase
      .from('designs')
      .update({
        title: formData.get("title"),
        description: formData.get("description"),
        images: imageUrls,
        fabrics: processedFabrics
      })
      .eq('id', designId)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { message: "Design updated successfully", design: data },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal Server Error',
      details: error
    }, { status: 500 })
  }
}

