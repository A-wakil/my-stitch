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
    
    const images = formData.getAll("images") as File[]
    const imageUrls: string[] = []
    
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

    const { data, error } = await supabase
      .from('designs')
      .insert({
        title: formData.get("title"),
        description: formData.get("description"),
        images: imageUrls,
        fabrics: fabricsData
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

