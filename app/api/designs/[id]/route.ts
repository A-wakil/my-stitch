import { supabase } from '../../../lib/supabaseClient'
import { NextRequest, NextResponse } from "next/server"
import { processImages, processVideos } from '../route'

// Updated type definition to match Next.js 15 requirements
type Params = { id: string }

async function getParamsId(params: Params) {
  return params.id;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    
    const { data: design, error } = await supabase
      .from('designs')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !design) {
      return NextResponse.json({ message: "Design not found" }, { status: 404 })
    }

    return NextResponse.json(design)
  } catch (error) {
    console.error('Error fetching design:', error)
    return NextResponse.json({ message: "Error fetching design" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData()
    const created_by = formData.get("created_by") as string
    const price = parseFloat(formData.get("price") as string)
    const currency_code = (formData.get("currency_code") as string) || 'USD'

    // Process design images and videos (using same bucket but separate columns)
    const imageUrls = await processImages(formData, 'design-images')
    const videoUrls = await processVideos(formData, 'design-images') // Using design-images bucket
    
    console.log('[ID] Update - Image URLs:', imageUrls)
    console.log('[ID] Update - Video URLs:', videoUrls)

    const { data, error } = await supabase
      .from('designs')
      .update({
        title: formData.get("title"),
        description: formData.get("description"),
        images: imageUrls, // Images in images column
        videos: videoUrls, // Videos in videos column
        price: price,
        currency_code: currency_code,
        created_by: created_by,
        completion_time: parseInt(formData.get("completion_time") as string),
        gender: formData.get("gender") as string
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating design:', error)
      return NextResponse.json({ message: "Design not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Design updated successfully", design: data })
  } catch (error) {
    console.error('Error updating design:', error)
    return NextResponse.json({ message: "Error updating design" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    
    const { error } = await supabase
      .from('designs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting design:', error)
      return NextResponse.json({ message: "Design not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Design deleted successfully" })
  } catch (error) {
    console.error('Error deleting design:', error)
    return NextResponse.json({ message: "Error deleting design" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const requestBody = await request.json();
    
    // Update only the fields provided in the request
    const { data, error } = await supabase
      .from('designs')
      .update(requestBody)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating design:', error);
      return NextResponse.json({ message: "Design not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      message: requestBody.is_deleted ? "Design soft-deleted successfully" : "Design updated successfully", 
      design: data 
    });
  } catch (error) {
    console.error('Error in PATCH design:', error);
    return NextResponse.json({ message: "Error updating design" }, { status: 500 });
  }
}

