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
  available_styles?: Array<{
    name: string;
    display_name: string;
    description?: string;
    recommended_yards: number;
  }>;
}

export async function GET() {
  try {
    const { data: designs, error } = await supabase
      .from('designs')
      .select('*')
      .eq('is_deleted', false)
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

export async function processImages(formData: FormData, bucket: string) {
  const images = formData.getAll("images") as File[]
  const imageUrls: string[] = JSON.parse(formData.get("existingImages") as string || "[]")
  
  for (const image of images) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(`${Date.now()}-${image.name}`, image)
      
      if (error) throw error
      
      const urlData = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)
      
      imageUrls.push(urlData.data.publicUrl)
    } catch (error) {
      console.error(`${bucket} upload error:`, error)
    }
  }
  
  return imageUrls
}

export async function processFabricsWithImages(fabricsData: any[], formData: FormData) {
  const fabricImages = formData.getAll("fabricImages") as File[]
  const fabricImageKeys = formData.getAll("fabricImageKeys") as string[]

  return Promise.all(fabricsData.map(async (fabric, index) => {
    let fabricImageUrl = fabric.image
    
    // Check if there's a corresponding fabric image to upload
    const fabricImage = fabricImages[index]
    const fabricImageKey = fabricImageKeys[index]
    
    if (fabricImage && fabricImageKey) {
      try {
        console.log('Uploading fabric image:', fabricImageKey)
        const { data, error } = await supabase.storage
          .from('fabric-images')
          .upload(fabricImageKey, fabricImage)
        
        if (error) {
          console.error('Supabase upload error:', error)
          throw error
        }
        
        if (data) {
          const urlData = supabase.storage
            .from('fabric-images')
            .getPublicUrl(data.path)
          fabricImageUrl = urlData.data.publicUrl
          console.log('Generated URL:', fabricImageUrl)
        }
      } catch (error) {
        console.error('Fabric image upload error:', error)
      }
    } else if (typeof fabricImageUrl === 'string' && fabricImageUrl.startsWith('fabrics/')) {
      // Convert existing paths to full URLs if they're not already
      const urlData = supabase.storage
        .from('fabric-images')
        .getPublicUrl(fabricImageUrl)
      fabricImageUrl = urlData.data.publicUrl
    }

    return {
      ...fabric,
      image: fabricImageUrl,
      colors: fabric.colors
    }
  }))
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const fabricsData = JSON.parse(formData.get("fabrics") as string)
    const created_by = formData.get("created_by") as string
    const availableStyles = formData.get("available_styles") 
      ? JSON.parse(formData.get("available_styles") as string) 
      : []
    
    console.log('Processing design submission...')
    console.log('Created by:', created_by)
    
    // Process design images
    const imageUrls = await processImages(formData, 'design-images')
    
    // Process fabrics and their images
    const processedFabrics = await processFabricsWithImages(fabricsData, formData)

    const { data, error } = await supabase
      .from('designs')
      .insert({
        title: formData.get("title"),
        description: formData.get("description"),
        images: imageUrls,
        fabrics: processedFabrics,
        created_by: created_by,
        completion_time: parseInt(formData.get("completion_time") as string),
        available_styles: availableStyles
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      throw error
    }

    return NextResponse.json(
      { message: "Design submitted successfully", design: data }, 
      { status: 201 }
    )
  } catch (error) {
    console.error('Submission error details:', error)
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
    const created_by = formData.get("created_by") as string
    const availableStyles = formData.get("available_styles") 
      ? JSON.parse(formData.get("available_styles") as string) 
      : []
    
    const imageUrls = await processImages(formData, 'design-images')
    const processedFabrics = await processFabricsWithImages(fabricsData, formData)

    const { data, error } = await supabase
      .from('designs')
      .update({
        title: formData.get("title"),
        description: formData.get("description"),
        images: imageUrls,
        fabrics: processedFabrics,
        created_by: created_by,
        completion_time: parseInt(formData.get("completion_time") as string),
        available_styles: availableStyles
      })
      .eq('id', designId)
      .select()
      .single()

    if (error) throw error

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

